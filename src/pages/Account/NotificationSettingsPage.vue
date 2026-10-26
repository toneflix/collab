<template>
  <q-page padding>
    <div class="max-w-2xl mx-auto">
      <div class="mb-8">
        <h1 class="text-2xl font-bold">Notification settings</h1>
        <p class="text-grey-5">
          Choose what reaches you when you're not in the app. Everything still
          shows up in your notifications list.
        </p>
      </div>

      <q-banner rounded dense class="mb-8 bg-green-10 text-white" v-if="unsubscribed">
        <template #avatar><q-icon name="lucide-mail-check" /></template>
        You won't get emails about {{ unsubscribed.title.toLowerCase() }} anymore. You can turn them back on below.
      </q-banner>

      <ListSkeleton :avatar="false" :rows="6" side v-if="loading && !settings" />

      <template v-else-if="settings">
        <section class="push-card">
          <div class="flex !flex-nowrap items-start gap-3">
            <q-icon name="lucide-smartphone" size="22px" class="!flex-none mt-1" :color="pushOn ? 'light-blue-4' : 'grey-6'" />
            <div>
              <div class="font-bold">Push on this device</div>
              <div class="text-sm text-grey-5">{{ pushText }}</div>
            </div>
            <q-btn
              rounded
              no-caps
              unelevated
              size="sm"
              class="!flex-none ml-auto"
              :color="pushOn ? 'grey-8' : 'light-blue-8'"
              :label="pushOn ? 'Turn off' : 'Turn on'"
              :loading="pushBusy"
              @click="togglePush"
              v-if="canUsePush"
            />
          </div>
        </section>

        <div class="settings-grid" role="table" aria-label="Notification settings">
          <div class="settings-grid__head" role="row">
            <span role="columnheader">Notify me about</span>
            <span role="columnheader" class="text-center">Email</span>
            <span role="columnheader" class="text-center">Push</span>
          </div>
          <div class="settings-grid__row" role="row" :key="c.key" v-for="c in settings.categories">
            <div role="cell" class="flex !flex-nowrap items-start gap-3">
              <q-icon :name="categoryLook[c.key].icon" :color="categoryLook[c.key].color" size="16px" class="!flex-none mt-1" />
              <div>
                <div class="font-bold">{{ c.title }}</div>
                <div class="text-sm text-grey-5">{{ c.description }}</div>
              </div>
            </div>
            <div role="cell" class="text-center">
              <q-toggle
                color="light-blue-6"
                :aria-label="`Email for ${c.title}`"
                :model-value="c.mail"
                @update:model-value="(v: boolean) => change(c, 'mail', v)"
              />
            </div>
            <div role="cell" class="text-center">
              <q-toggle
                color="light-blue-6"
                :aria-label="`Push for ${c.title}`"
                :disable="!settings.push.enabled"
                :model-value="c.push"
                @update:model-value="(v: boolean) => change(c, 'push', v)"
              />
            </div>
          </div>
        </div>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute } from 'vue-router';
import { useRequest } from 'alova/client';
import { notify } from 'src/utils/helpers';
import { DevicePush } from 'src/utils/push';
import { categoryLook } from 'src/components/Notifications/categories';
import {
  loadNotificationSettingsRequest,
  saveNotificationSettingsRequest,
  type NotificationCategorySetting,
  type NotificationSettings,
} from 'src/utils/requests/notifications';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';

const route = useRoute();

const { data, loading } = useRequest(loadNotificationSettingsRequest);
const settings = computed<NotificationSettings | null>(() => data.value ?? null);

const unsubscribed = computed(() => settings.value?.categories.find((c) => c.key === route.query.unsubscribed));

const permission = ref<NotificationPermission | 'unsupported'>('default');
const pushOn = ref(false);
const pushBusy = ref(false);

onMounted(async () => {
  permission.value = DevicePush.permission();
  pushOn.value = !!(await DevicePush.current());
});

const canUsePush = computed(() => !!settings.value?.push.enabled && permission.value !== 'unsupported' && permission.value !== 'denied');

const pushText = computed(() => {
  if (!settings.value?.push.enabled) return 'Push notifications aren\'t available yet.';
  if (permission.value === 'unsupported') return 'This browser doesn\'t support push notifications.';
  if (permission.value === 'denied') return 'Notifications are blocked for this site. Allow them in your browser settings, then reload.';
  if (pushOn.value) return 'This browser gets push notifications for the kinds you turn on below.';

  return 'Get alerts in this browser even when Toneflix Music is closed.';
});

const togglePush = async () => {
  if (!settings.value?.push.publicKey) return;

  pushBusy.value = true;
  try {
    const response = pushOn.value ? await DevicePush.disable() : await DevicePush.enable(settings.value.push.publicKey);
    pushOn.value = !pushOn.value;
    if (response?.data) data.value = response.data;
    if (response?.message) notify(response.message, 'success');
  } catch (e) {
    notify((e as { message?: string }).message || 'Push couldn\'t be turned on.', 'error');
  } finally {
    permission.value = DevicePush.permission();
    pushBusy.value = false;
  }
};

const change = async (category: NotificationCategorySetting, channel: 'mail' | 'push', value: boolean) => {
  const before = category[channel];
  category[channel] = value;

  try {
    await saveNotificationSettingsRequest({ [category.key]: { [channel]: value } }).send();
  } catch {
    category[channel] = before;
  }
};

useMeta(() => ({
  title: 'Notification settings',
  titleTemplate: (title) => `${title} - Toneflix Music`,
}));
</script>

<style lang="scss" scoped>
.push-card {
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}

.settings-grid {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  overflow: hidden;

  &__head,
  &__row {
    display: grid;
    grid-template-columns: 1fr 64px 64px;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
  }

  &__head {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #9e9e9e;
    background: rgba(255, 255, 255, 0.03);
  }

  &__row + &__row {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
}
</style>
