<template>
  <q-item
    clickable
    v-ripple
    class="notification-item"
    :class="{ 'notification-item--unread': !notification.readAt }"
    @click="open"
  >
    <q-item-section avatar top>
      <q-avatar size="34px" color="grey-9" :text-color="look.color">
        <q-icon :name="look.icon" size="15px" />
      </q-avatar>
    </q-item-section>

    <q-item-section>
      <q-item-label class="font-bold">{{ notification.title }}</q-item-label>
      <q-item-label caption class="!text-grey-5" :lines="dense ? 2 : 3">{{ notification.message }}</q-item-label>
      <q-item-label caption class="!text-grey-6 !mt-1">{{ timeAgoStamp(notification.createdAt) }}</q-item-label>
    </q-item-section>

    <q-item-section side top class="!pl-2">
      <span class="notification-item__dot" aria-label="Unread" v-if="!notification.readAt" />
      <q-btn
        flat
        round
        dense
        size="sm"
        icon="close"
        color="grey-6"
        aria-label="Remove notification"
        class="!flex-none mt-2"
        @click.stop="emit('remove', notification)"
        v-if="removable"
      />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { timeAgoStamp } from 'src/utils/helpers';
import { useNotificationStore } from 'src/stores/notification-store';
import type { AppNotification } from 'src/utils/requests/notifications';
import { categoryLook } from './categories';

const props = defineProps<{
  notification: AppNotification;
  dense?: boolean;
  removable?: boolean;
}>();

const emit = defineEmits<{
  remove: [notification: AppNotification];
  opened: [notification: AppNotification];
}>();

const router = useRouter();
const store = useNotificationStore();

const look = computed(() => categoryLook[props.notification.category ?? 'other'] ?? categoryLook.other);

const open = () => {
  void store.markRead(props.notification);
  emit('opened', props.notification);
  if (props.notification.path) void router.push(props.notification.path);
};
</script>

<style lang="scss" scoped>
.notification-item {
  border-radius: 10px;

  &--unread {
    background: rgba(255, 255, 255, 0.04);
  }

  &__dot {
    width: 8px;
    height: 8px;
    margin-top: 6px;
    border-radius: 50%;
    background: #4fc3f7;
  }
}
</style>
