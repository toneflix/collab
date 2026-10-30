<template>
  <q-no-ssr>
    <PaystackInline
      inline
      :amount="amount || 0"
      :customer="{ email: user.email || '', name: user.fullname }"
      :public-key="publicKey"
      :initialize-callback="initialize"
      :verify-callback="verify"
      @verified="onVerified"
      @error="onError"
    >
      <template #default="{ initialize: paystack, loading }">
        <slot :pay="() => start(paystack)" :loading="loading || busy">
          <q-btn
            no-caps
            class="flex-none!"
            v-bind="$attrs"
            :loading="loading || busy"
            :label="label"
            @click="start(paystack)"
          />
        </slot>
      </template>
    </PaystackInline>
    <template #placeholder>
      <q-btn
        no-caps
        disable
        class="flex-none!"
        v-bind="$attrs"
        :label="label"
      />
    </template>
  </q-no-ssr>
</template>

<script setup lang="ts">
/**
 * A button that pays for something and confirms the payment with the API.
 * Paystack pays in its popup. Flutterwave pays on its checkout page on the web
 * and in its Inline popup in the app. Payments that leave for another page or
 * app are kept as pending and confirmed on the payment return page.
 */
import { computed, defineAsyncComponent, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import { PaymentProvider, PaymentSession, ResponseBody, Transaction } from 'src/utils/models';
import { FlutterwaveInline } from 'src/utils/payments/flutterwave-inline';
import { PaymentChoice } from 'src/utils/payments/payment-choice';
import { PendingPayments } from 'src/utils/payments/pending-payments';
import {
  PaymentBody,
  startPaymentRequest,
  verifyPaymentRequest,
} from 'src/utils/requests/payments';

defineOptions({ inheritAttrs: false });

const PaystackInline = defineAsyncComponent(() =>
  import('@toneflix/paystack-inline').then((m) => m.PaystackInline),
);

const props = defineProps<{
  body: PaymentBody;
  label?: string;
  amount?: number;
}>();

const emit = defineEmits<{
  paid: [transaction: Transaction];
}>();

const $q = useQuasar();
const boot = useBootstrapStore();
const route = useRoute();
const router = useRouter();
const user = computed(() => boot.user);
const publicKey = computed(() => boot.configuration.paystack_public_key);
const isNative = !!import.meta.env.QUASAR_CAPACITOR_MODE;
const busy = ref(false);

let transaction: Transaction | undefined;

const showError = (e: unknown) => {
  const err = e as ResponseBody<unknown> & { message?: string };
  const first = err?.errors ? Object.values(err.errors)[0] : null;

  // The API already shows errors other than validation errors.
  if (first) notify(String(first), 'error');
  else if (e instanceof Error) notify(e.message, 'error');
};

/**
 * Sends guests to log in first, then pays with the provider the payer picks.
 */
const start = async (paystack: () => void) => {
  if (!user.value.id) {
    router.push({ name: 'auth.login' });
    return;
  }

  busy.value = true;

  let provider: PaymentProvider | null = null;

  try {
    provider = await new PaymentChoice($q).pick(props.amount);
  } catch (e) {
    showError(e);
  } finally {
    busy.value = false;
  }

  if (provider === 'paystack') paystack();
  if (provider === 'flutterwave') void flutterwave();
};

const startSession = (provider: PaymentProvider, inline: boolean) =>
  startPaymentRequest({
    ...props.body,
    provider,
    inline,
    return_path: route.fullPath,
  }).send();

const remember = (session: PaymentSession) =>
  PendingPayments.add({
    reference: session.reference,
    provider: session.provider,
    returnPath: route.fullPath,
  });

/**
 * Paystack's popup asks for the session here.
 */
const initialize = async () => {
  try {
    const { data } = await startSession('paystack', true);

    remember(data);

    // Paystack's inline client takes its own snake_case names.
    return {
      reference: data.reference,
      access_code: data.accessCode,
      authorization_url: data.authorizationUrl,
    };
  } catch (e) {
    showError(e);
    return undefined;
  }
};

const verify = async (reference: string) => {
  try {
    const { data, message } = await verifyPaymentRequest(reference).send();

    transaction = data;

    if (data.status !== 'pending') PendingPayments.remove(reference);

    return { status: data.status === 'complete', message };
  } catch {
    PendingPayments.remove(reference);

    // The API already showed why the payment wasn't confirmed.
    return { status: false };
  }
};

/**
 * Flutterwave Standard on the web: its checkout page sends the payer back to
 * the payment return page. Inline in the app: its popup pays in place.
 */
const flutterwave = async () => {
  busy.value = true;

  try {
    const { data } = await startSession('flutterwave', isNative);

    remember(data);

    if (!isNative) {
      if (!data.authorizationUrl) throw new Error('Flutterwave did not start the payment. Please try again.');

      window.location.assign(data.authorizationUrl);
      return;
    }

    const result = await FlutterwaveInline.pay(
      data,
      boot.configuration.flutterwave_public_key || '',
      { email: user.value.email || '', name: user.value.fullname },
      boot.configuration.app_name,
    );

    const { status, message } = await verify(data.reference);

    if (status) onVerified({ message });
    else if (result === 'finished' && transaction?.status === 'pending') {
      notify('Your payment is being confirmed.', 'info');
    }
  } catch (e) {
    showError(e);
  } finally {
    busy.value = false;
  }
};

const onVerified = (response: { message?: string }) => {
  notify(response.message || 'Payment successful.', 'success');
  if (transaction) emit('paid', transaction);
};

const onError = (error: { message?: string }) => {
  if (error?.message) notify(error.message, 'error');
};
</script>
