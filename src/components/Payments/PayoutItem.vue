<template>
  <q-item>
    <q-item-section avatar>
      <q-avatar rounded color="grey-9" v-if="!payout.user">
        <q-icon :name="methodIcon(payout.bank.method)" />
      </q-avatar>
      <q-avatar v-else>
        <img :src="payout.user.imageUrl" v-if="payout.user.imageUrl" />
        <q-icon name="lucide-user" v-else />
      </q-avatar>
    </q-item-section>

    <q-item-section>
      <q-item-label class="font-bold" v-if="payout.user">
        {{ payout.user.fullname || payout.user.username }}
        <span class="font-normal text-grey-5">@{{ payout.user.username }}</span>
      </q-item-label>
      <q-item-label :class="payout.user ? '' : 'font-bold'" :caption="!!payout.user">
        {{ [destination, payout.user ? payout.bank.accountName : '', payout.bank.country].filter(Boolean).join(' · ') }}
      </q-item-label>
      <q-item-label caption>
        {{ when }}
        <template v-if="payout.reviewer">· reviewed by {{ payout.reviewer.fullname }}</template>
      </q-item-label>
      <q-item-label caption class="text-red-4" v-if="payout.reason">{{ payout.reason }}</q-item-label>
    </q-item-section>

    <q-item-section side class="items-end gap-1">
      <q-item-label class="font-bold text-white">{{ price(payout.amount) }}</q-item-label>
      <q-item-label caption v-if="converted">{{ converted }}</q-item-label>
      <q-badge rounded :color="status.color" :label="status.label" />
      <div class="flex justify-end gap-1 mt-1" v-if="$slots.actions">
        <slot name="actions" />
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { date } from 'quasar';
import { usePayments } from 'src/composables/usePayments';
import { accountLine, methodIcon, money } from 'src/utils/requests/payouts';
import type { Payout, PayoutStatus } from 'src/utils/requests/payouts';

const props = defineProps<{
  payout: Payout;
}>();

const { price } = usePayments();

const statuses: Record<PayoutStatus, { label: string; color: string }> = {
  pending: { label: 'Awaiting approval', color: 'orange-9' },
  processing: { label: 'On its way', color: 'blue-8' },
  paid: { label: 'Paid', color: 'green-8' },
  failed: { label: 'Failed', color: 'red-9' },
  rejected: { label: 'Rejected', color: 'red-9' },
  cancelled: { label: 'Cancelled', color: 'grey-8' },
};

const status = computed(() => statuses[props.payout.status] ?? { label: props.payout.status, color: 'grey-8' });

const destination = computed(() =>
  accountLine({
    method: props.payout.bank.method || 'bank',
    bankName: props.payout.bank.name,
    accountNumber: props.payout.bank.accountNumber,
    provider: props.payout.provider || 'paystack',
  }),
);

// What the creator receives, when it is paid in another currency
const converted = computed(() => {
  const { payoutAmount, payoutCurrency, currency } = props.payout;
  return payoutCurrency && payoutCurrency !== currency ? `≈ ${money(payoutAmount, payoutCurrency)}` : '';
});

const when = computed(() =>
  date.formatDate(props.payout.paidAt || props.payout.createdAt, 'MMM D, YYYY h:mm A'),
);
</script>
