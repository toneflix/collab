<template>
  <!-- The app's bottom sheet: vue-spring-bottom-sheet in the app's colours -->
  <BottomSheet ref="sheet" v-model="open" v-bind="$attrs" :teleport-to="aboveDialogs ? TOP_LAYER : 'body'">
    <template #header v-if="title || $slots.header">
      <slot name="header">
        <h2 class="app-sheet__title">{{ title }}</h2>
      </slot>
    </template>
    <div class="app-sheet__body" ref="body">
      <slot />
    </div>
  </BottomSheet>
</template>

<script lang="ts">
type OpenSheet = {
  id: symbol;
  /** The sheet this one was opened from, if any. */
  parent: symbol | null;
  close: () => void;
  contains: (target: EventTarget | null) => boolean;
};

/** Every open sheet, in the order they opened. */
const openSheets: OpenSheet[] = [];

/** What was last pressed, to tell a sheet opened from inside another sheet. */
let pressed: EventTarget | null = null;
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', (event) => (pressed = event.target), true);
}

/** Holds sheets opened over a Quasar dialog, which sits above the usual sheet layer. */
const TOP_LAYER = '#app-sheet-top-layer';
const ensureTopLayer = () => {
  if (typeof document === 'undefined' || document.querySelector(TOP_LAYER)) return;
  const layer = document.createElement('div');
  layer.id = TOP_LAYER.slice(1);
  document.body.appendChild(layer);
};

/** The sheet and the ones it was opened from, which stay open. */
const lineOf = (entry: OpenSheet | undefined) => {
  const line = new Set<symbol>();
  while (entry) {
    line.add(entry.id);
    const parent: symbol | null = entry.parent;
    entry = openSheets.find((other) => other.id === parent);
  }
  return line;
};
</script>

<script setup lang="ts">
import BottomSheet from '@douxcode/vue-spring-bottom-sheet';
import '@douxcode/vue-spring-bottom-sheet/dist/style.css';
import { onBeforeUnmount, useTemplateRef, watch } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  /** Shown in the sheet's header, under the drag handle. */
  title?: string;
  /** For sheets opened from inside a Quasar dialog, like the full-screen player */
  aboveDialogs?: boolean;
}>();

if (props.aboveDialogs) ensureTopLayer();

const open = defineModel<boolean>({ default: false });
const sheet = useTemplateRef<InstanceType<typeof BottomSheet>>('sheet');
const body = useTemplateRef<HTMLElement>('body');

/*
 * One sheet at a time: opening one closes the others, unless it was opened
 * from inside an open sheet. That one stays underneath, and closing it closes
 * what it opened.
 */
const id = Symbol('sheet');
const self: OpenSheet = {
  id,
  parent: null,
  close: () => (open.value = false),
  contains: (target) => {
    const el = body.value?.closest('[data-vsbs-sheet]');
    return !!el && target instanceof Node && el.contains(target);
  },
};

const forget = () => {
  const at = openSheets.indexOf(self);
  if (at === -1) return;
  openSheets.splice(at, 1);
  openSheets.filter((other) => other.parent === id).forEach((child) => child.close());
};

watch(
  open,
  (isOpen) => {
    if (!isOpen) {
      forget();
      return;
    }
    if (openSheets.includes(self)) return;

    const opener = openSheets.find((other) => other.contains(pressed));
    pressed = null;
    self.parent = opener?.id ?? null;

    const keep = lineOf(opener);
    openSheets.filter((other) => !keep.has(other.id)).forEach((other) => other.close());
    openSheets.push(self);
  },
  { immediate: true },
);

onBeforeUnmount(forget);

defineExpose({
  open: () => sheet.value?.open(),
  close: () => sheet.value?.close(),
});
</script>

<style lang="scss">
/* Every sheet sits above the app's header and footer (2000) and below
   Quasar's menus and dialogs (6000), so pickers opened from a sheet show. */
[data-vsbs-backdrop],
[data-vsbs-sheet] {
  z-index: 5000;
}

/* Sheets opened from a dialog go in a layer above it; touches pass through
   to the dialog wherever there's no sheet */
#app-sheet-top-layer {
  position: fixed;
  inset: 0;
  z-index: 6500;
  pointer-events: none;
}

/* The backdrop is the sheet's sibling, so the colours live on :root */
:root {
  --vsbs-background: var(--tf-surface-1);
  --vsbs-backdrop-bg: rgba(0, 0, 0, 0.55);
  --vsbs-shadow-color: rgba(0, 0, 0, 0.5);
  --vsbs-border-color: var(--tf-border);
  --vsbs-handle-background: var(--tf-border-strong);
  --vsbs-border-radius: 20px;
}

[data-vsbs-sheet] {
  color: var(--tf-text);
}

/* Clear of the gesture bar when the app draws under it */
[data-vsbs-content] {
  padding-bottom: calc(12px + var(--q-safe-area-inset-bottom, 0px));
}

.app-sheet__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.5;
}
</style>
