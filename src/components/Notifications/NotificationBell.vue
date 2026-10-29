<template>
  <q-btn
    flat
    round
    class="flex-none! mr-2"
    aria-label="Notifications"
    :to="compact ? { name: 'notifications' } : undefined"
  >
    <q-icon name="lucide-bell" size="20px" />
    <q-badge floating rounded color="red-6" :label="badgeLabel" v-if="store.badge" />
    <q-tooltip>Notifications</q-tooltip>

    <q-menu
      dark
      v-if="!compact"
      anchor="bottom right"
      self="top right"
      class="notification-menu"
      :offset="[0, 8]"
      v-model="open"
    >
      <div class="w-[min(92vw,380px)] p-2">
        <div class="flex items-center justify-between px-2 py-1">
          <div class="text-base font-bold">Notifications</div>
          <div class="flex flex-none! gap-1">
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              color="light-blue-4"
              label="Mark all read"
              class="flex-none!"
              @click="store.markAllRead()"
              v-if="store.unread"
            />
            <IconBtn size="sm"
              icon="lucide-settings"
              color="grey-5"
              aria-label="Notification settings"
              class="flex-none!"
              :to="{ name: 'account.notifications' }"
              @click="open = false"
            />
          </div>
        </div>

        <q-item
          clickable
          v-ripple
          class="mx-1 my-1 rounded-lg bg-light-blue-10/30"
          :to="{ name: 'notifications', query: { tab: 'requests' } }"
          @click="open = false"
          v-if="store.pendingRequests"
        >
          <q-item-section avatar>
            <q-icon name="lucide-users-round" size="16px" color="light-blue-4" />
          </q-item-section>
          <q-item-section>
            {{ store.pendingRequests }} collab {{ store.pendingRequests === 1 ? 'request' : 'requests' }} waiting for you
          </q-item-section>
          <q-item-section side>
            <q-icon name="lucide-chevron-right" />
          </q-item-section>
        </q-item>

        <q-list class="max-h-[60vh] overflow-auto" v-if="latest.length">
          <NotificationItem
            dense
            :key="n.id"
            :notification="n"
            @opened="open = false"
            v-for="n in latest"
          />
        </q-list>
        <ListSkeleton dense :rows="4" v-else-if="store.loading" />
        <SimpleInfo class="m-2" icon="lucide-bell" text="You're all caught up." v-else />

        <q-btn
          flat
          no-caps
          class="w-full mt-1"
          color="grey-4"
          label="See all notifications"
          :to="{ name: 'notifications' }"
          @click="open = false"
        />
      </div>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useNotificationStore } from 'src/stores/notification-store';
import NotificationItem from './NotificationItem.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';

const $q = useQuasar();
const store = useNotificationStore();
const open = ref(false);

/** Phones get the full notifications page instead of a menu. */
const compact = computed(() => $q.screen.lt.sm);

const latest = computed(() => store.list.slice(0, 6));
const badgeLabel = computed(() => (store.badge > 99 ? '99+' : store.badge));
</script>
