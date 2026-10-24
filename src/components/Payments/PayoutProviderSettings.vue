<template>
  <q-spinner v-if="loading" />

  <q-form class="flex flex-col gap-4" @submit="save" v-else-if="settings">
    <div class="section" :key="provider.key" v-for="provider in providers">
      <div class="flex items-center gap-3 no-wrap">
        <q-toggle color="toneflix" class="!flex-none" :aria-label="`Pay creators with ${provider.name}`" v-model="toggles[`${provider.key}_payouts_enabled`]" />
        <div class="min-w-0 grow">
          <div class="font-bold">{{ provider.name }}</div>
          <div class="text-sm text-grey-5">{{ fields[`${provider.key}_payouts_enabled`]?.hint }}</div>
        </div>
        <q-badge
          rounded
          class="!flex-none"
          :color="countsFor(provider.key) ? 'green-9' : 'grey-8'"
          :label="countsFor(provider.key) ? `${countsFor(provider.key)} ${countsFor(provider.key) === 1 ? 'country' : 'countries'}` : 'Off'"
        />
      </div>

      <div class="mt-3 text-xs text-grey-5" v-if="countsFor(provider.key)">
        {{ countryNames(provider.key) }}
      </div>

      <div class="grid gap-3 mt-4 sm:grid-cols-2" v-if="provider.keys.length">
        <div :key="key" v-for="key in provider.keys">
          <q-input
            dark
            outlined
            dense
            hide-bottom-space
            autocomplete="off"
            :type="fields[key]?.secret ? 'password' : 'text'"
            :label="fields[key]?.title"
            :placeholder="fields[key]?.secret && fields[key]?.isSet ? 'Saved. Leave empty to keep it.' : ''"
            v-model="values[key]"
          />
          <div class="mt-1 text-xs text-grey-5">
            {{ fields[key]?.secret && fields[key]?.isSet ? 'Saved and hidden.' : fields[key]?.hint }}
          </div>
        </div>
      </div>

      <div class="mt-4">
        <div class="mb-1 text-xs text-grey-5">
          Webhook URL{{ provider.events ? ` (send ${provider.events})` : '' }}
        </div>
        <div class="callback">
          <code class="truncate">{{ settings.webhooks[provider.key] }}</code>
          <q-btn flat dense round size="sm" icon="content_copy" :aria-label="`Copy the ${provider.name} webhook URL`" class="!flex-none" @click="copy(settings.webhooks[provider.key])" />
        </div>
      </div>
    </div>

    <q-banner rounded dense class="text-white bg-orange-10" v-if="stripeNeedsRate">
      Set the Stripe exchange rate: how many {{ values.stripe_currency || 'USD' }} one {{ settings.currency }} is worth.
      Withdrawals to Stripe countries fail until it's set.
    </q-banner>

    <div>
      <q-btn unelevated rounded no-caps type="submit" color="toneflix" label="Save" class="!flex-none" :loading="saving" />
    </div>
  </q-form>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { copyToClipboard } from 'quasar';
import { notify } from 'src/utils/helpers';
import {
  loadPayoutSettingsRequest,
  payoutError,
  PayoutProvider,
  PayoutSettings,
  savePayoutSettingsRequest,
} from 'src/utils/requests/payouts';

const providers: { key: PayoutProvider; name: string; keys: string[]; events?: string }[] = [
  { key: 'paystack', name: 'Paystack', keys: [], events: 'transfer events' },
  { key: 'flutterwave', name: 'Flutterwave', keys: ['flutterwave_secret_key', 'flutterwave_webhook_hash'], events: 'transfer events' },
  {
    key: 'stripe',
    name: 'Stripe Connect',
    keys: ['stripe_connect_secret_key', 'stripe_webhook_secret', 'stripe_platform_country', 'stripe_currency', 'stripe_exchange_rate'],
    events: 'transfer.created and transfer.reversed',
  },
];

const loading = ref(true);
const saving = ref(false);
const settings = ref<PayoutSettings>();
const toggles = reactive<Record<string, boolean>>({});
const values = reactive<Record<string, string>>({});

const fields = computed(() => settings.value?.fields ?? {});

const countsFor = (provider: PayoutProvider) => settings.value?.countries.filter((c) => c.provider === provider).length ?? 0;
const countryNames = (provider: PayoutProvider) =>
  settings.value?.countries
    .filter((c) => c.provider === provider)
    .map((c) => c.name)
    .join(', ');

const stripeNeedsRate = computed(
  () =>
    !!toggles.stripe_payouts_enabled &&
    (values.stripe_currency || 'USD').toUpperCase() !== settings.value?.currency &&
    !Number(values.stripe_exchange_rate),
);

const fill = (data: PayoutSettings) => {
  settings.value = data;
  for (const [key, field] of Object.entries(data.fields)) {
    if (key.endsWith('_enabled')) toggles[key] = field.value === '1' || field.value === 'true';
    else values[key] = field.secret ? '' : (field.value ?? '');
  }
};

onMounted(async () => {
  try {
    const body = await loadPayoutSettingsRequest().send();
    fill(body.data);
  } catch (e) {
    notify(payoutError(e, 'The payout settings couldn\'t be loaded.'), 'error');
  } finally {
    loading.value = false;
  }
});

const save = async () => {
  saving.value = true;
  try {
    // Empty values clear a setting, except secrets, which keep what's saved.
    const body = await savePayoutSettingsRequest(
      { ...toggles, ...Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === '' ? null : v])) },
    ).send();
    fill(body.data);
    notify(body.message, 'success');
  } catch (e) {
    notify(payoutError(e, 'The settings couldn\'t be saved.'), 'error');
  } finally {
    saving.value = false;
  }
};

const copy = (text: string) => void copyToClipboard(text).then(() => notify('Copied.', 'success'));
</script>

<style lang="scss" scoped>
.section {
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
}

.callback {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  padding: 6px 6px 6px 12px;
  border-radius: 8px;
  background: #0d0f12;

  code {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 0.85rem;
  }
}
</style>
