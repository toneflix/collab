<template>
  <!-- Docked beside the editor on desktop, a side sheet on smaller screens. -->
  <Teleport :to="dock || 'body'" v-if="isDocked && open">
    <div class="studio-sheet-dock" :style="fit" ref="dockEl">
      <slot />
    </div>
  </Teleport>
  <q-dialog
    seamless
    position="right"
    :maximized="$q.screen.lt.sm"
    v-model="open"
    v-else-if="!isDocked"
  >
    <slot />
  </q-dialog>
</template>

<script lang="ts">
import { ref } from 'vue';

/** The sheet showing in the dock, so opening another closes it. */
const docked = ref<symbol | null>(null);
</script>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { computed, nextTick, onBeforeUnmount, watch } from 'vue';

const props = defineProps<{
  /** CSS selector of the page column to dock into on desktop. */
  dock?: string;
}>();

const emit = defineEmits<{ show: []; hide: [] }>();

const open = defineModel<boolean>({ default: false });

const $q = useQuasar();
const id = Symbol('sheet');
const isDocked = computed(() => !!props.dock && $q.screen.gt.sm);

watch(open, (value) => {
  if (value && isDocked.value) docked.value = id;
  if (value) emit('show');
  else emit('hide');
});

watch(docked, (current) => {
  if (current !== id && isDocked.value) open.value = false;
});

/**
 * Keep the docked panel between the header and the player bar, from where
 * it starts on the page, so its own content scrolls instead of the page.
 */
const dockEl = ref<HTMLElement>();
const fit = ref<Record<string, string>>({});
let frame = 0;

const measure = () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const column = dockEl.value?.parentElement;
    if (!column) return;
    const header = document.querySelector('.q-header')?.clientHeight ?? 0;
    // Only the part of the player bar that is on screen.
    const bar = document.querySelector('.q-footer')?.getBoundingClientRect();
    const footer = bar ? Math.max(window.innerHeight - bar.top, 0) : 0;
    const stick = header + 16;
    const top = Math.max(column.getBoundingClientRect().top, stick);
    fit.value = {
      top: `${stick}px`,
      height: `${Math.max(window.innerHeight - top - footer - 16, 240)}px`,
    };
  });
};

// The player bar slides in and out, so fit again once it settles.
const barWatcher =
  typeof MutationObserver === 'undefined'
    ? undefined
    : new MutationObserver(() => setTimeout(measure, 350));

const listen = (on: boolean) => {
  const method = on ? 'addEventListener' : 'removeEventListener';
  window[method]('scroll', measure, { passive: true, capture: true });
  window[method]('resize', measure);

  const bar = document.querySelector('.q-footer');
  if (on && bar) barWatcher?.observe(bar, { attributes: true });
  else barWatcher?.disconnect();
};

watch(
  () => isDocked.value && open.value,
  async (showing) => {
    listen(showing);
    if (showing) {
      await nextTick();
      measure();
    }
  },
);

onBeforeUnmount(() => {
  listen(false);
  cancelAnimationFrame(frame);
});
</script>

<style lang="scss" scoped>
.studio-sheet-dock {
  position: sticky;

  > :deep(.q-card) {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    box-shadow: none !important;
  }
}
</style>
