<template>
  <div>
    <p class="mb-4 text-sm text-grey-5">
      Listeners who gave one creator at least {{ rules.plays }} paid streams in a month, making up
      {{ rules.share }}% or more of their paid streams. Their streams to that creator are held from the payout
      until you clear them. Clearing a month that was already paid out pays the creator at that month's rate.
    </p>

    <q-tabs dense no-caps align="left" class="mb-3" active-color="toneflix" v-model="status">
      <q-tab name="pending" :label="pendingCount ? `Waiting (${pendingCount})` : 'Waiting'" />
      <q-tab name="cleared" label="Cleared" />
      <q-tab name="confirmed" label="Kept out" />
    </q-tabs>

    <q-list separator v-if="checks.length">
      <q-expansion-item
        dense-toggle
        expand-icon="lucide-chevron-down"
        header-class="py-3"
        :key="check.id"
        v-for="check in checks"
      >
        <template #header>
          <q-item-section avatar>
            <q-avatar color="grey-9" icon="lucide-user">
              <img :src="check.listener.imageUrl" v-if="check.listener?.imageUrl" />
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label class="font-bold" lines="1">
              {{ check.listener?.name || check.listener?.username || 'Deleted listener' }}
              <span class="font-normal text-grey-5">→ {{ check.owner?.name || check.owner?.username }}</span>
            </q-item-label>
            <q-item-label caption>
              {{ monthName(check.month) }} · {{ count(check.plays, 'paid stream') }} · {{ check.share }}% of theirs
            </q-item-label>
          </q-item-section>
          <q-item-section side v-if="check.status !== 'pending'">
            <q-item-label caption>{{ check.reviewer || 'Reviewed' }}</q-item-label>
            <q-item-label caption v-if="check.topUp">Paid {{ price(check.topUp) }}</q-item-label>
          </q-item-section>
        </template>

        <div class="px-4 pb-4">
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <div class="mb-1 text-xs text-grey-5">Listener</div>
              <router-link
                class="font-bold text-white"
                :to="{ name: 'admin.user', params: { id: check.listener.id } }"
                v-if="check.listener"
              >
                @{{ check.listener.username }}
              </router-link>
              <div class="text-xs text-grey-5" v-if="check.listener">Joined {{ joined(check.listener.joinedAt) }}</div>
            </div>
            <div>
              <div class="mb-1 text-xs text-grey-5">Creator</div>
              <router-link
                class="font-bold text-white"
                :to="{ name: 'admin.user', params: { id: check.owner.id } }"
                v-if="check.owner"
              >
                @{{ check.owner.username }}
              </router-link>
              <div class="text-xs text-grey-5" v-if="check.owner">Joined {{ joined(check.owner.joinedAt) }}</div>
            </div>
          </div>

          <div class="mt-4" v-if="check.tracks?.length">
            <div class="mb-1 text-xs text-grey-5">Played most</div>
            <div class="flex flex-nowrap justify-between gap-3 text-sm" :key="track.title" v-for="track in check.tracks">
              <span class="truncate">{{ track.title }}</span>
              <span class="flex-none! text-grey-5">{{ count(track.plays, 'day') }}</span>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-4" v-if="check.status === 'pending'">
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              color="red-4"
              label="Keep out of payout"
              class="flex-none!"
              :disable="!!busy"
              :loading="busy === `${check.id}:confirm`"
              @click="review(check, 'confirm')"
            />
            <q-btn
              unelevated
              dense
              rounded
              no-caps
              size="sm"
              padding="0 sm"
              color="toneflix"
              label="Clear and pay"
              class="flex-none!"
              :disable="!!busy"
              :loading="busy === `${check.id}:clear`"
              @click="review(check, 'clear')"
            />
          </div>
        </div>
      </q-expansion-item>
    </q-list>
    <ListSkeleton side :rows="3" v-else-if="loading" />
    <SimpleInfo v-else :text="status === 'pending' ? 'No streams waiting for review.' : 'Nothing here.'" />

    <div class="flex justify-center mt-6" v-if="pageCount > 1">
      <q-pagination class="flex-none!" v-model="page" :max="pageCount" direction-links />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { date } from 'quasar';
import { useWatcher } from 'alova/client';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import { usePayments } from 'src/composables/usePayments';
import { notify } from 'src/utils/helpers';
import {
  loadStreamChecksRequest,
  payoutError,
  reviewStreamCheckRequest,
  type StreamCheck,
  type StreamCheckStatus,
} from 'src/utils/requests/payouts';
import { count, monthName } from 'src/utils/stream-stats';

const emit = defineEmits<{ pending: [count: number] }>();

const { price } = usePayments();

const rules = computed(() => ({
  plays: data.value?.rules?.checkPlays ?? 100,
  share: data.value?.rules?.checkShare ?? 80,
}));

const status = ref<StreamCheckStatus>('pending');
const page = ref(1);
const busy = ref<string>();

watch(status, () => (page.value = 1));

const { data, loading, send: reload } = useWatcher(
  () => loadStreamChecksRequest({ status: status.value, page: page.value }),
  [status, page],
  { immediate: true },
);

const checks = computed(() => data.value?.data || []);
const pageCount = computed(() => data.value?.meta?.lastPage || 1);
const pendingCount = computed(() => data.value?.summary?.pendingCount || 0);

watch(pendingCount, (n) => emit('pending', n), { immediate: true });

const joined = (at: string) => date.formatDate(at, 'MMM D, YYYY');

const review = async (check: StreamCheck, decision: 'clear' | 'confirm') => {
  busy.value = `${check.id}:${decision}`;
  try {
    const body = await reviewStreamCheckRequest(check.id, decision).send();
    notify(body.message, 'success');
    void reload();
  } catch (e) {
    notify(payoutError(e, 'The check couldn\'t be saved.'), 'error');
  } finally {
    busy.value = undefined;
  }
};
</script>
