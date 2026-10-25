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
      <template #default="{ initialize: pay, loading }">
        <slot :pay="() => start(pay)" :loading="loading">
          <q-btn
            no-caps
            class="!flex-none"
            v-bind="$attrs"
            :loading="loading"
            :label="label"
            @click="start(pay)"
          />
        </slot>
      </template>
    </PaystackInline>
    <template #placeholder>
      <q-btn
        no-caps
        disable
        class="!flex-none"
        v-bind="$attrs"
        :label="label"
      />
    </template>
  </q-no-ssr>
</template>

<script setup lang="ts">
/**
 * A button that pays for something through Paystack and confirms the payment
 * with the API. Paystack's script needs the browser, so it only loads there.
 */
import { computed, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import { ResponseBody, Transaction } from 'src/utils/models';
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

const boot = useBootstrapStore();
const router = useRouter();
const user = computed(() => boot.user);
const publicKey = computed(() => boot.configuration.paystack_public_key);

let transaction: Transaction | undefined;

/**
 * Send guests to log in first.
 */
const start = (pay: () => void) => {
  if (!user.value.id) {
    router.push({ name: 'auth.login' });
    return;
  }

  pay();
};

const initialize = async () => {
  try {
    const { data } = await startPaymentRequest(props.body).send();
    // Paystack's inline client takes its own snake_case names.
    return {
      reference: data.reference,
      access_code: data.accessCode,
      authorization_url: data.authorizationUrl,
    };
  } catch (e) {
    const err = e as ResponseBody<unknown>;
    const first = err?.errors ? Object.values(err.errors)[0] : null;
    // The API already shows errors other than validation errors.
    if (first) notify(String(first), 'error');
    return undefined;
  }
};

const verify = async (reference: string) => {
  try {
    const { data, message } = await verifyPaymentRequest(reference).send();
    transaction = data;
    return { status: data.status === 'complete', message };
  } catch {
    // The API already showed why the payment wasn't confirmed.
    return { status: false };
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
