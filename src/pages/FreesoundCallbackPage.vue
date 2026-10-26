<template>
  <q-page padding class="flex items-center justify-center">
    <div class="max-w-md text-center">
      <template v-if="state === 'working'">
        <q-spinner size="32px" color="toneflix" />
        <div class="mt-4 text-lg">Connecting Freesound…</div>
      </template>
      <template v-else-if="state === 'done'">
        <q-icon name="lucide-circle-check" size="40px" color="green-5" />
        <div class="mt-4 text-lg font-bold">Freesound is connected</div>
        <div class="text-sm text-grey-5" v-if="username">Signed in as {{ username }}.</div>
        <q-btn unelevated rounded no-caps color="toneflix" class="mt-8" label="Continue" :to="back" />
      </template>
      <template v-else>
        <q-icon name="lucide-circle-alert" size="40px" color="red-4" />
        <div class="mt-4 text-lg font-bold">Freesound wasn't connected</div>
        <div class="text-sm text-grey-5">{{ message }}</div>
        <q-btn outline rounded no-caps color="white" class="mt-8" label="Go back" :to="back" />
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { finishFreesoundRequest } from 'src/utils/requests/sounds';

/**
 * Freesound sends people back here after they allow access. The code is
 * swapped for a token by the API, then they go back to where they were.
 */
const route = useRoute();
const router = useRouter();
const state = ref<'working' | 'done' | 'failed'>('working');
const message = ref('');
const username = ref('');
const back = ref('/studio');

onMounted(async () => {
  const { code, state: token, error } = route.query as Record<string, string | undefined>;
  if (error || !code || !token) {
    state.value = 'failed';
    message.value = error === 'access_denied' ? 'Access wasn\'t allowed on Freesound.' : 'Freesound didn\'t send a sign-in code.';
    return;
  }
  try {
    const res = await finishFreesoundRequest(code, token).send();
    username.value = res.data.username || '';
    back.value = res.return || '/studio';
    state.value = 'done';
    // Straight back to the studio; the page above is for when that's slow.
    setTimeout(() => void router.replace(back.value), 1200);
  } catch (e) {
    state.value = 'failed';
    message.value = (e as { message?: string })?.message || 'Try connecting again.';
  }
});
</script>
