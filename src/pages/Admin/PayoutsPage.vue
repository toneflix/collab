<template>
  <q-page padding>
    <div class="max-w-3xl mx-auto">
      <div class="py-4">
        <h1 class="text-3xl font-circlular-std">Payouts</h1>
        <p class="text-grey-5">
          Creators' withdrawal requests. Approving one sends the money from your
          Paystack balance to their bank.
        </p>
      </div>

      <q-banner rounded dense class="mb-4 text-white bg-orange-10" v-if="summary.pendingCount">
        {{ summary.pendingCount }} waiting for approval, {{ price(summary.pendingAmount) }} in total.
      </q-banner>

      <div class="flex flex-wrap items-center gap-3 mb-2">
        <q-tabs dense no-caps align="left" active-color="toneflix" class="!flex-none" v-model="status">
          <q-tab :key="option.value" :name="option.value" :label="option.label" v-for="option in statuses" />
        </q-tabs>
        <q-input
          dark
          dense
          outlined
          clearable
          debounce="400"
          placeholder="Search username, email or reference"
          class="ml-auto min-w-56"
          v-model="search"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>

      <q-list separator v-if="list.length">
        <PayoutItem :key="payout.id" :payout="payout" v-for="payout in list">
          <template #actions v-if="payout.status === 'pending'">
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              color="red-4"
              label="Reject"
              :disable="!!busy"
              @click="reject(payout)"
            />
            <q-btn
              unelevated
              dense
              rounded
              no-caps
              size="sm"
              padding="0 sm"
              color="toneflix"
              label="Approve"
              :loading="busy === payout.id"
              :disable="!!busy && busy !== payout.id"
              @click="approve(payout)"
            />
          </template>
          <template #actions v-else-if="payout.status === 'processing'">
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              label="Check status"
              :loading="busy === payout.id"
              @click="sync(payout)"
            />
          </template>
        </PayoutItem>
      </q-list>
      <div class="py-10 text-center" v-else-if="loading">
        <q-spinner size="32px" />
      </div>
      <SimpleInfo v-else text="Nothing here." />

      <div class="flex justify-center mt-4" v-if="pageCount > 1">
        <q-pagination class="!flex-none" v-model="page" :max="pageCount" direction-links />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import { useWatcher } from 'alova/client';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import PayoutItem from 'src/components/Payments/PayoutItem.vue';
import { usePayments } from 'src/composables/usePayments';
import { notify } from 'src/utils/helpers';
import {
  approvePayoutRequest,
  loadAdminPayoutsRequest,
  Payout,
  payoutError,
  PayoutStatus,
  rejectPayoutRequest,
  syncPayoutRequest,
} from 'src/utils/requests/payouts';

const $q = useQuasar();
const { price } = usePayments();

const statuses: { value: PayoutStatus | ''; label: string }[] = [
  { value: 'pending', label: 'Waiting' },
  { value: 'processing', label: 'On its way' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: '', label: 'All' },
];

const status = ref<PayoutStatus | ''>('pending');
const search = ref<string | null>('');
const page = ref(1);
const busy = ref<number>();

watch([status, search], () => (page.value = 1));

const { data, loading, send: reload } = useWatcher(
  () => loadAdminPayoutsRequest({ status: status.value, search: search.value || '', page: page.value }),
  [status, search, page],
  { immediate: true },
);

const list = computed(() => data.value?.data || []);
const pageCount = computed(() => data.value?.meta?.last_page || 1);
const summary = computed(() => data.value?.summary || { pendingCount: 0, pendingAmount: 0 });

const act = async (payout: Payout, request: () => Promise<{ message: string }>, fallback: string) => {
  busy.value = payout.id;
  try {
    const body = await request();
    notify(body.message, 'success');
    void reload();
  } catch (e) {
    notify(payoutError(e, fallback), 'error');
  } finally {
    busy.value = undefined;
  }
};

const approve = (payout: Payout) => {
  $q.dialog({
    dark: true,
    title: 'Send this withdrawal?',
    message: `${price(payout.amount)} goes to ${payout.bank.accountName} (${payout.bank.name} ${payout.bank.accountNumber}).`,
    cancel: { flat: true, noCaps: true, label: 'Not yet' },
    ok: { unelevated: true, rounded: true, noCaps: true, color: 'toneflix', label: 'Send' },
  }).onOk(() => void act(payout, () => approvePayoutRequest(payout.id).send(), 'The withdrawal couldn\'t be sent.'));
};

const reject = (payout: Payout) => {
  $q.dialog({
    dark: true,
    title: 'Reject this withdrawal?',
    message: 'The amount goes back to the creator\'s balance. They\'ll see the reason you give.',
    prompt: { model: '', type: 'text', outlined: true, dark: true, label: 'Reason (optional)', maxlength: 255 },
    cancel: { flat: true, noCaps: true, label: 'Keep it' },
    ok: { unelevated: true, rounded: true, noCaps: true, color: 'red-8', label: 'Reject' },
  }).onOk((reason: string) =>
    void act(payout, () => rejectPayoutRequest(payout.id, reason || undefined).send(), 'The withdrawal couldn\'t be rejected.'),
  );
};

const sync = (payout: Payout) =>
  act(payout, () => syncPayoutRequest(payout.id).send(), 'Paystack couldn\'t be reached.');

useMeta(() => ({
  title: 'Payouts',
  titleTemplate: (title) => `${title} - Toneflix Collab`,
}));
</script>
