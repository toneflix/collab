<template>
  <q-dialog v-model="show" @show="amount = summary.available">
    <q-card class="w-full max-w-sm bg-dark">
      <q-card-section>
        <div class="text-lg font-bold">Withdraw earnings</div>
        <div class="text-xs text-grey-5">
          {{ price(summary.available) }} available.
          {{ autoApprove ? 'It\'s sent to your account straight away.' : 'An admin reviews each withdrawal before it\'s sent.' }}
        </div>
      </q-card-section>

      <q-form @submit="submit">
        <q-card-section class="flex flex-col gap-3 pt-0">
          <q-input
            dark
            filled
            dense
            type="number"
            label="Amount"
            step="0.01"
            :prefix="symbol"
            :rules="[
              (v) => Number(v) >= summary.minimum || `The smallest withdrawal is ${price(summary.minimum)}`,
              (v) => Number(v) <= summary.available || 'That is more than your available balance',
            ]"
            v-model.number="amount"
          >
            <template #append>
              <q-btn flat dense no-caps size="sm" label="Max" class="flex-none!" @click="amount = summary.available" />
            </template>
          </q-input>

          <div class="flex items-center gap-3 px-4 py-2 rounded destination">
            <q-icon :name="methodIcon(account.method)" class="flex-none! text-grey-5" />
            <div>
              <div class="text-sm font-bold">{{ account.accountName }}</div>
              <div class="text-xs text-grey-5">{{ accountLine(account) }}</div>
              <div class="text-xs text-grey-5" v-if="account.currency !== currency">
                Converted to {{ account.currency }} when it's sent.
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" class="flex-none!" v-close-popup />
          <q-btn
            unelevated
            rounded
            no-caps
            type="submit"
            color="toneflix"
            class="flex-none!"
            :label="`Withdraw ${price(amount)}`"
            :loading="sending"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePayments } from 'src/composables/usePayments';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import {
  accountLine,
  methodIcon,
  Payout,
  PayoutAccount,
  payoutError,
  PayoutSummary,
  requestPayoutRequest,
} from 'src/utils/requests/payouts';

defineProps<{
  summary: PayoutSummary;
  account: PayoutAccount;
}>();

const emit = defineEmits<{
  requested: [payout: Payout, summary: PayoutSummary];
}>();

const show = defineModel<boolean>({ default: false });

const boot = useBootstrapStore();
const { currency, price, symbol } = usePayments();

const amount = ref(0);
const sending = ref(false);
const autoApprove = computed(() => !!boot.configuration.payout_auto_approve);

const submit = async () => {
  sending.value = true;
  try {
    const body = await requestPayoutRequest(Number(amount.value)).send();
    notify(body.message, 'success');
    emit('requested', body.data, body.summary);
    show.value = false;
  } catch (e) {
    notify(payoutError(e, 'The withdrawal couldn\'t be requested.'), 'error');
  } finally {
    sending.value = false;
  }
};
</script>

<style scoped>
.destination {
  background: rgba(255, 255, 255, 0.06);
}
</style>
