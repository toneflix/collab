<template>
  <div class="grid gap-4">
    <q-select
      dark
      filled
      use-input
      fill-input
      hide-selected
      input-debounce="300"
      label="Add an account"
      hint="Its users can then see its runs and queue prompts from Studio."
      option-value="id"
      option-label="label"
      :options="candidates"
      :loading="searching"
      @filter="findCandidates"
      @update:model-value="add"
      :model-value="null"
    >
      <template #option="{ itemProps, opt }">
        <q-item v-bind="itemProps" :disable="opt.contentAgent">
          <q-item-section>
            <q-item-label>{{ opt.name || opt.username }}</q-item-label>
            <q-item-label caption>@{{ opt.username }}</q-item-label>
          </q-item-section>
          <q-item-section side v-if="opt.contentAgent">
            <q-item-label caption>Already added</q-item-label>
          </q-item-section>
        </q-item>
      </template>
    </q-select>

    <q-list separator class="accounts" v-if="list.length">
      <q-item :key="account.id" v-for="account in list">
        <q-item-section avatar>
          <q-avatar size="36px" color="grey-9">
            <img :src="account.imageUrl" v-if="account.imageUrl" />
            <q-icon name="lucide-user" v-else />
          </q-avatar>
        </q-item-section>
        <q-item-section>
          <q-item-label class="font-bold">{{ account.name || account.username }}</q-item-label>
          <q-item-label caption>
            @{{ account.username }} ·
            <span v-if="account.aiTools">{{ account.credits }} credits</span>
            <span class="text-orange-4" v-else>no AI tools on its plan</span>
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            flat
            dense
            no-caps
            size="sm"
            color="red-4"
            label="Remove"
            class="flex-none!"
            :loading="busy === account.id"
            @click="remove(account)"
          />
        </q-item-section>
      </q-item>
    </q-list>
    <ListSkeleton v-else-if="loading" />
    <SimpleInfo v-else text="No agent accounts yet. Add one to start queuing prompts." />

    <div class="flex justify-center" v-if="pageCount > 1">
      <q-pagination class="flex-none!" v-model="page" :max="pageCount" direction-links />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useWatcher } from 'alova/client';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import { notify } from 'src/utils/helpers';
import { notifyError } from 'src/utils/composer';
import { loadAgentOwnersRequest, setAgentAccountRequest, type AgentOwner } from 'src/utils/requests/agent';

const $q = useQuasar();

const page = ref(1);
const busy = ref<number>();
const candidates = ref<(AgentOwner & { label: string })[]>([]);
const searching = ref(false);

const { data, loading, send: reload } = useWatcher(
  () => loadAgentOwnersRequest({ page: page.value, limit: 20 }),
  [page],
  { immediate: true },
);

const list = computed(() => data.value?.data || []);
const pageCount = computed(() => data.value?.meta?.lastPage || 1);

const findCandidates = (search: string, update: (fn: () => void) => void) => {
  searching.value = true;
  loadAgentOwnersRequest({ search, all: true, limit: 10 })
    .send()
    .then((body) =>
      update(() => {
        candidates.value = body.data.map((owner) => ({ ...owner, label: `${owner.name || owner.username} (@${owner.username})` }));
      }),
    )
    .catch(() => update(() => (candidates.value = [])))
    .finally(() => (searching.value = false));
};

const set = async (account: AgentOwner, enabled: boolean) => {
  busy.value = account.id;

  try {
    const body = await setAgentAccountRequest(account.id, enabled).send();
    notify(body.message, 'success');
    void reload();
  } catch (e) {
    notifyError(e, 'That didn\'t work.');
  } finally {
    busy.value = undefined;
  }
};

const add = (account: AgentOwner | null) => {
  if (account && !account.contentAgent) void set(account, true);
};

const remove = (account: AgentOwner) => {
  $q.dialog({
    dark: true,
    title: 'Remove this agent account?',
    message: 'Its runs and everything they made stay on the account. Its users can no longer queue prompts.',
    cancel: { flat: true, noCaps: true, label: 'Keep it' },
    ok: { unelevated: true, rounded: true, noCaps: true, color: 'red-8', label: 'Remove' },
  }).onOk(() => void set(account, false));
};
</script>

<style lang="scss" scoped>
.accounts {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
}
</style>
