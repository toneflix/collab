<template>
  <SettingsSections :sections="sections" v-model="view">
    <template #new>
      <AgentRunForm :scope="scope" :settings="settings" @queued="queued" />
    </template>

    <template #accounts>
      <AgentAccounts />
    </template>

    <template #default>
      <q-list separator class="runs" v-if="list.length">
        <AgentRunItem :key="run.id" :run="run" @open="openRun = run.id" v-for="run in list" />
      </q-list>
      <ListSkeleton v-else-if="loading" />
      <SimpleInfo v-else text="Nothing here." />

      <div class="flex justify-center mt-8" v-if="pageCount > 1">
        <q-pagination class="!flex-none" v-model="page" :max="pageCount" direction-links />
      </div>
    </template>
  </SettingsSections>

  <AgentRunDialog :scope="scope" :run-id="openRun" @close="openRun = null" @changed="() => void reload()" />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useWatcher } from 'alova/client';
import SettingsSections, { type SettingsSection } from 'src/components/Admin/SettingsSections.vue';
import AgentAccounts from './AgentAccounts.vue';
import AgentRunForm from './AgentRunForm.vue';
import AgentRunItem from './AgentRunItem.vue';
import AgentRunDialog from './AgentRunDialog.vue';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import {
  isActiveRun,
  loadAgentRunsRequest,
  type AgentRun,
  type AgentRunView,
  type AgentScope,
} from 'src/utils/requests/agent';

const props = defineProps<{ scope: AgentScope }>();

type View = AgentRunView | 'new' | 'accounts';

const view = ref<View>('new');
const page = ref(1);
const openRun = ref<number | null>(null);
let timer: ReturnType<typeof setInterval> | undefined;

/** The form needs the agent's limits, so a list always loads; the queue stands in on the other sections */
const status = computed<AgentRunView>(() => (view.value === 'new' || view.value === 'accounts' ? 'open' : view.value));

watch(status, () => (page.value = 1));

const { data, loading, send: reload } = useWatcher(
  () => loadAgentRunsRequest(props.scope, { status: status.value, page: page.value }),
  [status, page],
  { immediate: true },
);

const list = computed(() => data.value?.data || []);
const pageCount = computed(() => data.value?.meta?.lastPage || 1);
const settings = computed(() => data.value?.agent || null);
const openCount = computed(() => (status.value === 'open' ? data.value?.meta?.total || 0 : undefined));

const sections = computed<SettingsSection<View>[]>(() => [
  { key: 'new', icon: 'lucide-sparkles', title: 'New prompt', caption: 'Instructions for the agent to build.' },
  { key: 'open', icon: 'lucide-loader', title: 'Queue', caption: 'Runs waiting or being built.', count: openCount.value },
  { key: 'succeeded', icon: 'lucide-circle-check', title: 'Finished', caption: 'Runs that built everything.' },
  { key: 'failed', icon: 'lucide-circle-alert', title: 'Failed', caption: 'Runs that stopped or were cancelled.' },
  ...(props.scope === 'admin'
    ? [{ key: 'accounts' as const, icon: 'lucide-users', title: 'Agent accounts', caption: 'Accounts the agent builds for.' }]
    : []),
]);

const queued = (run: AgentRun) => {
  view.value = 'open';
  openRun.value = run.id;
};

// Keep the queue fresh while something in it is moving.
watch(list, (runs) => {
  clearInterval(timer);
  if (view.value === 'open' && runs.some(isActiveRun)) timer = setInterval(() => void reload(), 10000);
});

onBeforeUnmount(() => clearInterval(timer));
</script>

<style lang="scss" scoped>
.runs {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
}
</style>
