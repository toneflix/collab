<template>
  <q-page padding>
    <div class="max-w-6xl mx-auto">
      <div class="py-8">
        <h1 class="text-3xl font-circlular-std">Payouts</h1>
        <p class="text-grey-5">
          Creators' withdrawal requests. Approving one sends the money through the
          provider that pays the creator's country.
        </p>
      </div>

      <SettingsSections :sections="sections" v-model="view">
        <template #providers>
          <PayoutProviderSettings />
        </template>

        <template #streams>
          <StreamPeriodsAdmin />
        </template>

        <template #default>
          <q-banner rounded dense class="mb-8 text-white bg-orange-10" v-if="view === 'pending' && summary.pendingCount">
            {{ summary.pendingCount }} waiting for approval, {{ price(summary.pendingAmount) }} in total.
          </q-banner>

          <div class="flex flex-wrap items-center gap-3 mb-2">
            <q-input
              dark
              dense
              outlined
              clearable
              debounce="400"
              placeholder="Search username, email or reference"
              class="min-w-56"
              v-model="search"
            >
              <template #prepend><q-icon name="lucide-search" /></template>
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
          <ListSkeleton side v-else-if="loading" />
          <SimpleInfo v-else text="Nothing here." />

          <div class="flex justify-center mt-8" v-if="pageCount > 1">
            <q-pagination class="flex-none!" v-model="page" :max="pageCount" direction-links />
          </div>
        </template>
      </SettingsSections>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import { useWatcher } from 'alova/client';
import SettingsSections, { type SettingsSection } from 'src/components/Admin/SettingsSections.vue';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import PayoutItem from 'src/components/Payments/PayoutItem.vue';
import PayoutProviderSettings from 'src/components/Payments/PayoutProviderSettings.vue';
import StreamPeriodsAdmin from 'src/components/Payments/StreamPeriodsAdmin.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { usePayments } from 'src/composables/usePayments';
import { notify } from 'src/utils/helpers';
import {
  accountLine,
  approvePayoutRequest,
  money,
  loadAdminPayoutsRequest,
  Payout,
  payoutError,
  PayoutStatus,
  rejectPayoutRequest,
  syncPayoutRequest,
} from 'src/utils/requests/payouts';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';

const $q = useQuasar();
const boot = useBootstrapStore();
const { price } = usePayments();

const canConfigure = computed(() => !!boot.user?.permissions?.includes('manage-configuration'));
type View = PayoutStatus | 'all' | 'streams' | 'providers';

const view = ref<View>('pending');
const status = computed<PayoutStatus | ''>(() =>
  view.value === 'all' || view.value === 'streams' || view.value === 'providers' ? '' : view.value,
);
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
const pageCount = computed(() => data.value?.meta?.lastPage || 1);
const summary = computed(() => data.value?.summary || { pendingCount: 0, pendingAmount: 0 });

const sections = computed(() => {
  const list: SettingsSection<View>[] = [
    {
      key: 'pending',
      icon: 'lucide-hourglass',
      title: 'Waiting',
      caption: 'Withdrawals to approve or reject.',
      count: summary.value.pendingCount,
    },
    {
      key: 'processing',
      icon: 'lucide-send',
      title: 'On its way',
      caption: 'Sent and waiting for the provider.',
    },
    { key: 'paid', icon: 'lucide-circle-check', title: 'Paid', caption: 'Money that reached the creator.' },
    { key: 'failed', icon: 'lucide-circle-alert', title: 'Failed', caption: 'Rejected or bounced withdrawals.' },
    { key: 'all', icon: 'lucide-list', title: 'All', caption: 'Every withdrawal request.' },
    { key: 'streams', icon: 'lucide-audio-lines', title: 'Streams', caption: 'The monthly stream pool.' },
  ];

  return canConfigure.value
    ? [
        ...list,
        {
          key: 'providers',
          icon: 'lucide-landmark',
          title: 'Providers',
          caption: 'Paystack, Flutterwave and Stripe Connect.',
        },
      ]
    : list;
});

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
    message: `${price(payout.amount)} goes to ${payout.bank.accountName} (${accountLine({
      method: payout.bank.method || 'bank',
      bankName: payout.bank.name,
      accountNumber: payout.bank.accountNumber,
      provider: payout.provider || 'paystack',
    })})${payout.payoutCurrency && payout.payoutCurrency !== payout.currency ? `, paid out as ${money(payout.payoutAmount, payout.payoutCurrency)}` : ''}.`,
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
  act(payout, () => syncPayoutRequest(payout.id).send(), 'The provider couldn\'t be reached.');

useMeta(() => ({
  title: 'Payouts',
  titleTemplate: (title) => `${title} - Toneflix Music`,
}));
</script>
