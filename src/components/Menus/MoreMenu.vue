<template>
  <IconBtn icon="lucide-ellipsis-vertical" :label="label" :tooltip="false" @click="sheet && (sheetOpen = true)">
    <q-menu dark class="track-menu" anchor="bottom right" self="top right" v-if="!sheet">
      <slot />
    </q-menu>
  </IconBtn>

  <AppSheet v-model="sheetOpen" v-if="sheet">
    <template #header v-if="$slots.header">
      <slot name="header" />
    </template>
    <div @click="sheetOpen = false">
      <slot />
    </div>
  </AppSheet>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import AppSheet from 'src/components/Controllers/AppSheet.vue';

/**
 * A ⋮ button with a menu of actions: a dropdown on desktop, a bottom sheet
 * on phones. Fill it with `TrackMenuItem` rows.
 */
withDefaults(defineProps<{ label?: string }>(), { label: 'More actions' });

const $q = useQuasar();

const sheetOpen = ref(false);
/** Screen size is only known in the browser, and the sheet only renders there */
const mounted = ref(false);

const sheet = computed(() => mounted.value && $q.screen.lt.sm);

onMounted(() => (mounted.value = true));
</script>
