<template>
  <div>
    <div class="flex flex-wrap items-center gap-3 px-4 pt-4 pb-3">
      <q-tabs dense no-caps align="left" active-color="toneflix" class="flex-none! max-w-full" v-model="status">
        <q-tab name="" label="All" />
        <q-tab :key="option.value" :name="option.value" :label="option.label" v-for="option in section.statuses" />
      </q-tabs>
      <q-btn
        unelevated
        rounded
        no-caps
        color="toneflix"
        icon="lucide-plus"
        class="ml-auto flex-none!"
        :label="`Add ${section.noun}`"
        @click="edit(null)"
      />
    </div>

    <div class="flex flex-wrap items-center gap-3 px-4 pb-4">
      <q-input dark dense outlined clearable debounce="400" class="flex-1 min-w-48" :placeholder="`Search ${section.title.toLowerCase()} or #id`" v-model="search">
        <template #prepend><q-icon name="lucide-search" /></template>
      </q-input>
      <q-chip removable dense color="grey-9" class="flex-none!" icon="lucide-user" :label="`Owner #${ownerId}`" @remove="emit('clear-owner')" v-if="ownerId" />
      <q-select dark dense outlined emit-value map-options class="w-36 flex-none!" :options="sorts" v-model="sort" />
    </div>

    <q-list separator class="rows" v-if="list.length">
      <q-item :key="item.id" clickable @click="edit(item)" v-for="item in list">
        <q-item-section class="min-w-0">
          <ModeratedItemRow show-owner hide-type hide-status plain class="w-full min-w-0" :item="item" />
        </q-item-section>
        <q-item-section side class="gt-xs">
          <div class="flex items-center gap-1 justify-end">
            <q-badge rounded class="flex-none!" :color="badge.color" :label="badge.label" :key="badge.label" v-for="badge in badges(item)" />
          </div>
          <q-item-label caption class="mt-1">{{ date.formatDate(item.createdAt, 'MMM D, YYYY') }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="flex items-center gap-1 flex-nowrap">
            <IconBtn size="sm" icon="lucide-external-link" aria-label="Open" :to="item.link" @click.stop v-if="item.link" />
            <IconBtn size="sm" icon="lucide-trash-2" aria-label="Delete" @click.stop="remove(item)" />
          </div>
        </q-item-section>
      </q-item>
    </q-list>
    <ListSkeleton avatar="square" class="px-4" v-else-if="loading" />
    <SimpleInfo class="px-4 pb-4" :text="`No ${section.title.toLowerCase()} match.`" v-else />

    <div class="flex justify-center py-6" v-if="pageCount > 1">
      <q-pagination class="flex-none!" v-model="page" :max="pageCount" :max-pages="7" direction-links boundary-numbers />
    </div>

    <ContentEditDialog :type="type" :item="editing" @saved="refresh" @remove="remove" v-model="editOpen" />
    <DeleteContentDialog :item="deleting" @deleted="refresh" v-model="deleteOpen" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { date } from 'quasar';
import { useWatcher } from 'alova/client';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import ModeratedItemRow from 'src/components/Moderation/ModeratedItemRow.vue';
import DeleteContentDialog from 'src/components/Moderation/DeleteContentDialog.vue';
import ContentEditDialog from './ContentEditDialog.vue';
import { contentSection } from 'src/utils/admin-content';
import { loadAdminContentRequest, type AdminContent, type ContentKind } from 'src/utils/requests/adminContent';

const props = defineProps<{ type: ContentKind; ownerId?: number | null }>();
const emit = defineEmits<{ 'clear-owner': [] }>();

const sorts = [
  { value: 'latest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'title', label: 'Name' },
];

const section = computed(() => contentSection(props.type));

const status = ref('');
const search = ref<string | null>('');
const sort = ref('latest');
const page = ref(1);
const editing = ref<AdminContent | null>(null);
const deleting = ref<AdminContent | null>(null);
const editOpen = ref(false);
const deleteOpen = ref(false);

watch(
  () => props.type,
  () => {
    status.value = '';
    search.value = '';
  },
);

watch([status, search, sort, () => props.ownerId, () => props.type], () => (page.value = 1));

const { data, loading, send } = useWatcher(
  () =>
    loadAdminContentRequest(props.type, {
      status: status.value,
      search: search.value || '',
      sort: sort.value,
      user_id: props.ownerId,
      page: page.value,
    }),
  [status, search, sort, page, () => props.ownerId, () => props.type],
  { immediate: true },
);

const list = computed(() => data.value?.data || []);
const pageCount = computed(() => data.value?.meta?.lastPage || 1);

/** Short status labels for a row */
const badges = (item: AdminContent) => {
  const f = item.fields;
  const list: { label: string; color: string }[] = [];

  if (item.takenDown) list.push({ label: 'Taken down', color: 'red-9' });
  if (item.type === 'release') {
    if (f.inReview) list.push({ label: 'In review', color: 'orange-9' });
    else if (f.retired) list.push({ label: 'Retired', color: 'grey-8' });
    else list.push(f.published ? { label: 'Live', color: 'green-9' } : { label: 'Draft', color: 'grey-8' });
  }
  if (item.type === 'song') list.push(f.published ? { label: 'Published', color: 'green-9' } : { label: 'Private', color: 'grey-8' });
  if (item.type === 'track' || item.type === 'project') {
    list.push(f.privacy === 'private' ? { label: 'Private', color: 'grey-8' } : { label: 'Public', color: 'green-9' });
  }
  if (item.type === 'track' && !f.hasAudio) list.push({ label: 'No audio', color: 'orange-9' });
  if (item.type === 'artist') {
    if (f.verified) list.push({ label: 'Verified', color: 'toneflix' });
    if (!item.owner) list.push({ label: 'Unclaimed', color: 'grey-8' });
  }

  return list;
};

const edit = (item: AdminContent | null) => {
  editing.value = item;
  editOpen.value = true;
};

const remove = (item: AdminContent) => {
  editOpen.value = false;
  deleting.value = item;
  deleteOpen.value = true;
};

const refresh = () => void send();
</script>

<style lang="scss" scoped>
.rows {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
