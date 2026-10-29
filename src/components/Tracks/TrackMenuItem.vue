<template>
  <q-item clickable v-close-popup class="track-menu-item" @click="select">
    <q-item-section avatar>
      <q-icon :name="icon" size="20px" />
    </q-item-section>
    <q-item-section>{{ label }}</q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { useRouter, type RouteLocationRaw } from 'vue-router';

/**
 * One row of a track menu. Links go through the router on click, so rows
 * pointing at the page you're on don't show as active.
 */
const props = defineProps<{
  icon: string;
  label: string;
  to?: RouteLocationRaw;
}>();

const emit = defineEmits<{ click: [] }>();

const router = useRouter();

const select = () => {
  if (props.to) void router.push(props.to);
  emit('click');
};
</script>
