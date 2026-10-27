<template>
  <q-item class="rounded-lg">
    <q-item-section avatar top>
      <q-avatar size="34px" color="grey-9" text-color="light-blue-5">
        <q-icon name="lucide-users-round" size="15px" />
      </q-avatar>
    </q-item-section>

    <q-item-section>
      <q-item-label class="font-bold">{{ request.title }}</q-item-label>
      <q-item-label caption class="text-grey-5!">{{ request.message }}</q-item-label>
      <q-item-label caption class="text-grey-6! mt-1!">{{ timeAgoStamp(request.createdAt) }}</q-item-label>
      <div class="flex gap-2 mt-2">
        <q-btn
          rounded
          unelevated
          no-caps
          size="sm"
          color="light-blue-8"
          label="Accept"
          class="flex-none!"
          :loading="busy === 'accept'"
          :disable="!!busy"
          @click="answer(true)"
        />
        <q-btn
          rounded
          outline
          no-caps
          size="sm"
          color="grey-5"
          label="Decline"
          class="flex-none!"
          :loading="busy === 'decline'"
          :disable="!!busy"
          @click="answer(false)"
        />
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { notify, timeAgoStamp } from 'src/utils/helpers';
import { useNotificationStore } from 'src/stores/notification-store';
import type { CollabRequest } from 'src/utils/requests/notifications';

const props = defineProps<{ request: CollabRequest }>();

const store = useNotificationStore();
const busy = ref<'accept' | 'decline' | null>(null);

const answer = async (accept: boolean) => {
  busy.value = accept ? 'accept' : 'decline';
  try {
    await store.answer(props.request, accept);
    const invitation = props.request.customData?.action === 'invitation';
    notify(
      !accept ? 'Declined.' : invitation ? 'You joined the project.' : 'Approved.',
      'success',
    );
  } catch (e) {
    notify((e as { message?: string }).message || 'That didn\'t work. Try again.', 'error');
  } finally {
    busy.value = null;
  }
};
</script>
