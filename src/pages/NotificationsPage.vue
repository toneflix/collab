<template>
  <q-page padding>
    <div class="max-w-2xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold">Notifications</h1>
        <div class="flex !flex-none gap-2">
          <q-btn
            rounded
            outline
            no-caps
            size="sm"
            label="Mark all read"
            class="!flex-none"
            @click="store.markAllRead()"
            v-if="tab === 'activity' && store.unread"
          />
          <q-btn
            rounded
            outline
            no-caps
            size="sm"
            icon="lucide-settings"
            label="Settings"
            class="!flex-none"
            :to="{ name: 'account.notifications' }"
          />
        </div>
      </div>

      <q-tabs dense no-caps align="left" class="mb-2" active-color="toneflix" v-model="tab">
        <q-tab name="activity" label="Activity">
          <q-badge floating rounded color="red-6" :label="store.unread" v-if="store.unread" />
        </q-tab>
        <q-tab name="requests" label="Collab requests">
          <q-badge floating rounded color="red-6" :label="store.pendingRequests" v-if="store.pendingRequests" />
        </q-tab>
      </q-tabs>

      <template v-if="tab === 'activity'">
        <q-list class="flex flex-col gap-1" v-if="store.list.length">
          <NotificationItem
            removable
            :key="n.id"
            :notification="n"
            @remove="store.remove($event)"
            v-for="n in store.list"
          />
        </q-list>
        <ListSkeleton v-else-if="store.loading" />
        <SimpleInfo
          text="Nothing yet. Collab invitations, messages you missed and sales show up here."
          v-else
        />

        <div class="flex justify-center mt-8" v-if="store.page < store.lastPage">
          <q-btn rounded outline no-caps label="Load more" class="!flex-none" :loading="store.loading" @click="store.loadMore()" />
        </div>
      </template>

      <template v-else>
        <q-list separator v-if="store.requests.length">
          <CollabRequestItem :key="r.id" :request="r" v-for="r in store.requests" />
        </q-list>
        <SimpleInfo text="No invitations or requests are waiting for you." v-else />
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import NotificationItem from 'src/components/Notifications/NotificationItem.vue';
import CollabRequestItem from 'src/components/Notifications/CollabRequestItem.vue';
import { useNotificationStore } from 'src/stores/notification-store';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';

const route = useRoute();
const router = useRouter();
const store = useNotificationStore();

const tab = computed({
  get: () => (route.query.tab === 'requests' ? 'requests' : 'activity'),
  set: (value: string) => void router.replace({ query: { ...route.query, tab: value } }),
});

void store.load();

useMeta(() => ({
  title: 'Notifications',
  titleTemplate: (title) => `${title} - Toneflix Music`,
}));
</script>
