<template>
  <q-page padding>
    <div class="max-w-5xl mx-auto">
      <div class="py-8">
        <h1 class="text-3xl font-circlular-std">Users</h1>
        <p class="text-grey-5">Find an account to see its numbers and manage it.</p>
      </div>

      <div class="flex flex-wrap items-center gap-3 mb-4">
        <q-tabs dense no-caps align="left" active-color="toneflix" class="!flex-none" v-model="status">
          <q-tab :key="option.value" :name="option.value" :label="option.label" v-for="option in statuses" />
        </q-tabs>
        <q-input
          dark
          dense
          outlined
          clearable
          debounce="400"
          placeholder="Search name, username or email"
          class="ml-auto min-w-64"
          v-model="search"
        >
          <template #prepend><q-icon name="lucide-search" /></template>
        </q-input>
        <q-select
          dark
          dense
          outlined
          emit-value
          map-options
          class="w-36 !flex-none"
          :options="sorts"
          v-model="sort"
        />
      </div>

      <q-list separator class="users" v-if="list.length">
        <q-item clickable :key="user.id" :to="{ name: 'admin.user', params: { id: user.id } }" v-for="user in list">
          <q-item-section avatar>
            <q-avatar size="40px" color="grey-9">
              <img :src="user.imageUrl" v-if="user.imageUrl" />
              <q-icon name="lucide-user" v-else />
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label class="font-bold">
              {{ user.fullname || user.username }}
              <q-icon name="lucide-circle-check" color="toneflix" size="12px" class="ml-1" v-if="user.verified" />
              <q-badge rounded color="red-9" label="Banned" class="ml-1" v-if="user.suspended && !user.suspendedUntil" />
              <q-badge rounded color="orange-9" label="Suspended" class="ml-1" v-else-if="user.suspended" />
            </q-item-label>
            <q-item-label caption>@{{ user.username }} · {{ user.email }}</q-item-label>
          </q-item-section>
          <q-item-section side class="gt-xs">
            <div class="flex items-center gap-1 justify-end">
              <q-badge
                rounded
                outline
                class="!flex-none"
                color="grey-5"
                :key="role"
                :label="role"
                v-for="role in (user.roles || []).filter((r) => r !== 'user')"
              />
              <q-badge rounded color="toneflix" class="!flex-none" :label="user.plan.name" v-if="user.plan && !user.plan.isDefault" />
            </div>
            <q-item-label caption class="mt-1">
              {{ user.projectsCount }} projects · {{ user.releasesCount || 0 }} releases · joined
              {{ date.formatDate(user.createdAt, 'MMM D, YYYY') }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
      <ListSkeleton side v-else-if="loading" />
      <SimpleInfo v-else text="No users match." />

      <div class="flex justify-center mt-8" v-if="pageCount > 1">
        <q-pagination class="!flex-none" v-model="page" :max="pageCount" :max-pages="7" direction-links boundary-numbers />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { date, useMeta } from 'quasar';
import { useWatcher } from 'alova/client';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import { loadAdminUsersRequest } from 'src/utils/requests/adminUsers';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';

const statuses = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'premium', label: 'Paid plan' },
  { value: 'verified', label: 'Verified' },
  { value: 'staff', label: 'Staff' },
  { value: 'suspended', label: 'Suspended' },
];

const sorts = [
  { value: 'latest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name', label: 'Name' },
];

const status = ref('');
const search = ref<string | null>('');
const sort = ref('latest');
const page = ref(1);

watch([status, search, sort], () => (page.value = 1));

const { data, loading } = useWatcher(
  () =>
    loadAdminUsersRequest({
      status: status.value,
      search: search.value || '',
      sort: sort.value,
      page: page.value,
    }),
  [status, search, sort, page],
  { immediate: true },
);

const list = computed(() => data.value?.data || []);
const pageCount = computed(() => data.value?.meta?.lastPage || 1);

useMeta(() => ({
  title: 'Users',
  titleTemplate: (title) => `${title} - Toneflix Music`,
}));
</script>

<style lang="scss" scoped>
.users {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
}
</style>
