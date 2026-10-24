<template>
  <!-- Docked beside the editor on desktop, a side sheet on smaller screens. -->
  <Teleport :to="dock || 'body'" v-if="isDocked && open">
    <div class="studio-sheet-dock">
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
import { computed, watch } from 'vue';

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
</script>

<style lang="scss" scoped>
/* The page sizes the dock column to the screen; the panel fills it. */
.studio-sheet-dock {
  height: 100%;

  > :deep(.q-card) {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    box-shadow: none !important;
  }
}
</style>
