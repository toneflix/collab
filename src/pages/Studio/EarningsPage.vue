<template>
  <q-page padding>
    <div class="max-w-2xl mx-auto">
      <h1 class="mb-1 text-2xl font-bold">Earnings</h1>
      <p class="mb-4 text-sm text-grey-5">
        What you've earned from release sales, stem sales and tips. You keep
        {{ share }}% of each payment.
      </p>

      <q-card flat bordered class="mb-4 bg-dark balance">
        <q-card-section class="flex flex-wrap items-end gap-4">
          <div>
            <div class="text-xs text-grey-5">Available to withdraw</div>
            <div class="text-3xl font-bold">{{ price(wallet.available) }}</div>
            <div class="mt-1 text-xs text-grey-5">
              <template v-if="wallet.clearing">
                {{ price(wallet.clearing) }} clearing
                <q-icon name="info" size="14px" class="cursor-help">
                  <q-tooltip class="text-sm">
                    New earnings can be withdrawn {{ wallet.holdDays }} days after
                    the payment, in case it's refunded.
                  </q-tooltip>
                </q-icon>
                ·
              </template>
              {{ price(wallet.withdrawn) }} withdrawn
              <template v-if="wallet.inFlight"> · {{ price(wallet.inFlight) }} on the way</template>
            </div>
          </div>

          <div class="!flex-none">
            <q-btn
              unelevated
              rounded
              no-caps
              color="toneflix"
              icon="fas fa-money-bill-transfer"
              label="Withdraw"
              :disable="!canWithdraw"
              @click="withdrawing = true"
            />
            <q-tooltip v-if="!canWithdraw && withdrawHint">{{ withdrawHint }}</q-tooltip>
          </div>
        </q-card-section>

        <q-separator dark />

        <q-item class="py-3">
          <q-item-section avatar>
            <q-avatar rounded color="grey-9" icon="fas fa-building-columns" size="40px" />
          </q-item-section>
          <q-item-section v-if="account">
            <q-item-label class="font-bold">{{ account.accountName }}</q-item-label>
            <q-item-label caption>{{ account.bankName }} · {{ account.accountNumber }}</q-item-label>
          </q-item-section>
          <q-item-section v-else>
            <q-item-label class="font-bold">No bank account yet</q-item-label>
            <q-item-label caption>Add the account your withdrawals are paid into.</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              outline
              rounded
              no-caps
              size="sm"
              color="white"
              :label="account ? 'Change' : 'Add account'"
              @click="editingAccount = true"
            />
          </q-item-section>
        </q-item>
      </q-card>

      <div class="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4">
        <q-card flat bordered class="col-span-2 bg-dark md:col-span-1">
          <q-card-section>
            <div class="text-xs text-grey-5">Total earned</div>
            <div class="text-2xl font-bold">{{ price(summary.earned) }}</div>
          </q-card-section>
        </q-card>
        <q-card
          flat
          bordered
          class="bg-dark"
          :key="kind.key"
          v-for="kind in kinds"
        >
          <q-card-section>
            <div class="text-xs text-grey-5">{{ kind.label }}</div>
            <div class="text-lg font-bold">
              {{ price(summary.byPurpose[kind.key]?.earned) }}
            </div>
            <div class="text-xs text-grey-5">
              {{ summary.byPurpose[kind.key]?.count || 0 }} payments
            </div>
          </q-card-section>
        </q-card>
      </div>

      <q-tabs
        dense
        no-caps
        align="left"
        class="mb-2"
        active-color="toneflix"
        v-model="tab"
      >
        <q-tab name="" label="All" />
        <q-tab
          :key="kind.key"
          :name="kind.key"
          :label="kind.label"
          v-for="kind in kinds"
        />
        <q-tab name="withdrawals" label="Withdrawals" />
      </q-tabs>

      <template v-if="tab === 'withdrawals'">
        <q-list separator v-if="payoutList.length">
          <PayoutItem :key="payout.id" :payout="payout" v-for="payout in payoutList">
            <template #actions v-if="payout.status === 'pending'">
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                color="red-4"
                label="Cancel"
                :loading="cancelling === payout.id"
                @click="cancel(payout)"
              />
            </template>
          </PayoutItem>
        </q-list>
        <div class="py-10 text-center" v-else-if="payoutsLoading">
          <q-spinner size="32px" />
        </div>
        <SimpleInfo v-else text="No withdrawals yet. When you withdraw, it shows up here with its status." />

        <div class="flex justify-center mt-4" v-if="payoutPages > 1">
          <q-pagination class="!flex-none" v-model="payoutPage" :max="payoutPages" direction-links />
        </div>
      </template>

      <template v-else>
        <q-list separator v-if="earnings.length">
          <TransactionItem
            :key="transaction.id"
            :transaction="transaction"
            v-for="transaction in earnings"
          />
        </q-list>
        <div class="py-10 text-center" v-else-if="loading">
          <q-spinner size="32px" />
        </div>
        <SimpleInfo
          v-else
          text="No earnings yet. Set a price on a release or its stems in your releases, and fans can tip you from your profile."
        />

        <div class="flex justify-center mt-4" v-if="pageCount > 1">
          <q-pagination class="!flex-none" v-model="page" :max="pageCount" direction-links />
        </div>
      </template>
    </div>

    <PayoutAccountDialog v-model="editingAccount" :account="account" @saved="onAccountSaved" />
    <WithdrawDialog
      v-model="withdrawing"
      :summary="wallet"
      :account="account"
      @requested="onRequested"
      v-if="account"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useWatcher } from 'alova/client';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import PayoutAccountDialog from 'src/components/Payments/PayoutAccountDialog.vue';
import PayoutItem from 'src/components/Payments/PayoutItem.vue';
import TransactionItem from 'src/components/Payments/TransactionItem.vue';
import WithdrawDialog from 'src/components/Payments/WithdrawDialog.vue';
import { usePayments } from 'src/composables/usePayments';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import { Earnings } from 'src/utils/models';
import { useRealtimeChannel } from 'src/utils/realtime';
import { loadEarningsRequest } from 'src/utils/requests/payments';
import {
  cancelPayoutRequest,
  loadPayoutsRequest,
  Payout,
  PayoutAccount,
  payoutError,
  PayoutSummary,
} from 'src/utils/requests/payouts';

const { price } = usePayments();
const boot = useBootstrapStore();
const share = computed(() => Number(boot.configuration.creator_share || 85));

const kinds = [
  { key: 'release' as const, label: 'Releases' },
  { key: 'stems' as const, label: 'Stems' },
  { key: 'tip' as const, label: 'Tips' },
];

const tab = ref('');
const page = ref(1);
const purpose = computed(() => (tab.value === 'withdrawals' ? '' : tab.value));

watch(purpose, () => (page.value = 1));

const { data, loading } = useWatcher(
  () => loadEarningsRequest({ purpose: purpose.value, page: page.value, limit: 20 }),
  [purpose, page],
  { immediate: true },
);

const earnings = computed(() => data.value?.data || []);
const pageCount = computed(() => data.value?.meta?.last_page || 1);
const summary = computed<Earnings>(
  () => data.value?.summary || { earned: 0, currency: '', byPurpose: {} },
);

// Balance, bank account and withdrawals
const payoutPage = ref(1);
const editingAccount = ref(false);
const withdrawing = ref(false);
const cancelling = ref<number>();

const {
  data: payouts,
  loading: payoutsLoading,
  send: reloadPayouts,
} = useWatcher(() => loadPayoutsRequest({ page: payoutPage.value, limit: 15 }), [payoutPage], {
  immediate: true,
});

const payoutList = computed(() => payouts.value?.data || []);
const payoutPages = computed(() => payouts.value?.meta?.last_page || 1);
const account = ref<PayoutAccount | null>(null);
const wallet = ref<PayoutSummary>({
  earned: 0,
  clearing: 0,
  withdrawn: 0,
  inFlight: 0,
  available: 0,
  minimum: 0,
  holdDays: 0,
  currency: '',
});

watch(payouts, (body) => {
  if (!body) return;
  account.value = body.account;
  wallet.value = body.summary;
});

const canWithdraw = computed(
  () => !!account.value && wallet.value.available > 0 && wallet.value.available >= wallet.value.minimum,
);

const withdrawHint = computed(() => {
  if (!account.value) return 'Add a bank account first';
  if (wallet.value.available < wallet.value.minimum) {
    return `You can withdraw once you have ${price(wallet.value.minimum)} available`;
  }
  return '';
});

const onAccountSaved = (saved: PayoutAccount | null) => (account.value = saved);

const onRequested = (_payout: Payout, next: PayoutSummary) => {
  wallet.value = next;
  tab.value = 'withdrawals';
  payoutPage.value = 1;
  void reloadPayouts();
};

const cancel = async (payout: Payout) => {
  cancelling.value = payout.id;
  try {
    const body = await cancelPayoutRequest(payout.id).send();
    wallet.value = body.summary;
    notify(body.message, 'success');
    void reloadPayouts();
  } catch (e) {
    notify(payoutError(e, 'The withdrawal couldn\'t be cancelled.'), 'error');
  } finally {
    cancelling.value = undefined;
  }
};

// Withdrawals move on while the page is open, e.g. when the bank confirms a transfer.
useRealtimeChannel(() => (boot.user?.id ? `user.${boot.user.id}` : null), {
  'payout.updated': () => void reloadPayouts(),
});

useMeta(() => ({
  title: 'Earnings',
  titleTemplate: (title) => `${title} - Toneflix Collab`,
}));
</script>

<style scoped>
.balance {
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(3, 191, 255, 0.16), transparent 60%),
    var(--q-dark);
}
</style>
