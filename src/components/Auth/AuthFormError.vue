<template>
  <!-- A sign-in problem that isn't about one field, so it never fails silently -->
  <q-banner dense rounded class="auth-form-error" role="alert" v-if="message">
    <template #avatar>
      <q-icon name="lucide-circle-alert" size="18px" />
    </template>
    {{ message }}
  </q-banner>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  /** The form request's error: the API's error body, or a network error */
  error?: unknown;
}>();

const message = computed(() => {
  const error = props.error as { errors?: Record<string, unknown>; message?: string } | Error | undefined;
  if (!error) return '';

  // Field errors show under their fields
  if ('errors' in error && error.errors && Object.keys(error.errors).length) return '';

  // No response at all: offline, blocked, or the server couldn't be reached
  if (error instanceof TypeError || (error instanceof Error && /fetch|network|timeout/i.test(error.message))) {
    return "Couldn't reach Toneflix Music. Check your connection and try again.";
  }

  return error.message || "Something went wrong and you couldn't be signed in. Try again.";
});
</script>

<style lang="scss" scoped>
.auth-form-error {
  margin-bottom: 16px;
  color: #ffd7d7;
  background: rgba(229, 57, 53, 0.16);
}
</style>
