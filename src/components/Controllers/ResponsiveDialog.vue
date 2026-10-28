<template>
  <!-- Phones: the app's bottom sheet -->
  <AppSheet v-model="open" v-bind="sheetProps" v-if="sheet">
    <template #header>
      <div class="flex items-center justify-between gap-2 flex-nowrap!">
        <div class="min-w-0 text-lg font-bold">
          <slot name="title">{{ title }}</slot>
        </div>
        <IconBtn icon="lucide-x" class="flex-none!" :aria-label="`Close ${title || 'sheet'}`" @click="open = false" />
      </div>
    </template>
    <slot :sheet="true" />
  </AppSheet>

  <!-- Larger screens: a dialog -->
  <q-dialog
    v-model="open"
    v-bind="$attrs"
    @before-show="emit('before-show')"
    @show="emit('show')"
    @hide="emit('hide')"
    v-else
  >
    <q-card flat :class="cardClass">
      <q-toolbar>
        <q-toolbar-title class="flex items-center gap-2">
          <slot name="title">{{ title }}</slot>
        </q-toolbar-title>
        <IconBtn icon="lucide-x" :aria-label="`Close ${title || 'dialog'}`" v-close-popup />
      </q-toolbar>
      <q-separator />
      <q-card-section :class="bodyClass">
        <slot :sheet="false" />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
/**
 * A dialog on larger screens and a bottom sheet on phones, with the same
 * content. The default slot gets `sheet`, so content can lay itself out for
 * either (e.g. a list on phones, cards on desktop). Attributes go to the
 * q-dialog; `sheetProps` go to the bottom sheet.
 */
import { useQuasar } from 'quasar';
import { computed, watch } from 'vue';
import AppSheet from 'src/components/Controllers/AppSheet.vue';

defineOptions({ inheritAttrs: false });

defineProps<{
  /** Shown in the header; the `title` slot replaces it */
  title?: string;
  /** Classes for the dialog's card, e.g. a width */
  cardClass?: unknown;
  /** Classes for the dialog's body, e.g. a max height to scroll in */
  bodyClass?: unknown;
  /** Options for the bottom sheet (see AppSheet), like snap points */
  sheetProps?: Record<string, unknown>;
}>();

const emit = defineEmits<{
  'before-show': [];
  show: [];
  hide: [];
}>();

const open = defineModel<boolean>({ default: false });

const $q = useQuasar();
const sheet = computed(() => $q.screen.lt.sm);

// The dialog reports these itself; the bottom sheet needs them here
watch(open, (value) => {
  if (!sheet.value) return;
  if (value) {
    emit('before-show');
    emit('show');
  } else {
    emit('hide');
  }
});

</script>
