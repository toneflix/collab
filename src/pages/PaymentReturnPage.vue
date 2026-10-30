<template>
  <q-page padding class="flex items-center justify-center">
    <div class="max-w-md text-center">
      <template v-if="state === 'working'">
        <q-spinner size="32px" color="toneflix" />
        <div class="mt-4 text-lg">Confirming your payment…</div>
      </template>
      <template v-else-if="state === 'done'">
        <q-icon name="lucide-circle-check" size="40px" color="green-5" />
        <div class="mt-4 text-lg font-bold">Payment successful</div>
        <div class="text-sm text-grey-5" v-if="charged">{{ charged }} paid.</div>
        <q-btn unelevated rounded no-caps color="toneflix" class="mt-8" label="Continue" :to="back" />
      </template>
      <template v-else-if="state === 'pending'">
        <q-icon name="lucide-clock" size="40px" color="orange-5" />
        <div class="mt-4 text-lg font-bold">Payment still processing</div>
        <div class="text-sm text-grey-5">It goes through on its own once your bank confirms it.</div>
        <div class="flex justify-center gap-3 mt-8">
          <q-btn outline rounded no-caps color="white" label="Check again" :loading="checking" @click="check" />
          <q-btn unelevated rounded no-caps color="toneflix" label="Continue" :to="back" />
        </div>
      </template>
      <template v-else>
        <q-icon name="lucide-circle-alert" size="40px" color="red-4" />
        <div class="mt-4 text-lg font-bold">Payment not completed</div>
        <div class="text-sm text-grey-5">{{ message }}</div>
        <q-btn outline rounded no-caps color="white" class="mt-8" label="Go back" :to="back" />
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { PaymentChoice } from 'src/utils/payments/payment-choice';
import { PendingPayments } from 'src/utils/payments/pending-payments';
import { verifyPaymentRequest } from 'src/utils/requests/payments';

/**
 * Payment providers send payers back here, on the web and through the app's
 * links. The payment is confirmed with the API, then they go back to where they paid.
 */
const route = useRoute();
const router = useRouter();
const reference = String(route.params.reference);
const state = ref<'working' | 'done' | 'pending' | 'failed'>('working');
const checking = ref(false);
const message = ref('');
const charged = ref('');
const back = ref(PendingPayments.find(reference)?.returnPath || '/');

/** Tries a few times while the provider is still settling the payment. */
const attempts = [0, 2000, 4000];

const confirm = async () => {
  const { data } = await verifyPaymentRequest(reference).send();

  if (data.returnPath) back.value = data.returnPath;

  if (data.chargeAmount && data.currency) {
    charged.value = PaymentChoice.format(data.chargeAmount, data.currency);
  }

  return data.status;
};

const check = async () => {
  checking.value = true;

  try {
    for (const wait of attempts) {
      if (wait) await new Promise((done) => setTimeout(done, wait));

      const status = await confirm();

      if (status === 'pending') continue;

      PendingPayments.remove(reference);
      state.value = status === 'complete' ? 'done' : 'failed';
      message.value = status === 'complete' ? '' : 'The payment was declined or cancelled.';

      if (status === 'complete') setTimeout(() => void router.replace(back.value), 1500);

      return;
    }

    state.value = 'pending';
  } catch (e) {
    PendingPayments.remove(reference);
    state.value = 'failed';
    message.value = (e as { message?: string })?.message || 'Try paying again.';
  } finally {
    checking.value = false;
  }
};

onMounted(() => void check());
</script>
