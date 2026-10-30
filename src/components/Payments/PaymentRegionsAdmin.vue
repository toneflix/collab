<template>
  <div>
    <p class="mb-4 text-sm text-grey-5">
      Countries in a region pay through its providers, in its currency. Everyone else pays in
      {{ currency }} through every provider that is on.
    </p>

    <div class="flex flex-wrap items-center gap-3 mb-2">
      <q-input
        dark
        dense
        outlined
        clearable
        debounce="400"
        placeholder="Search regions"
        class="min-w-56"
        v-model="search"
      >
        <template #prepend><q-icon name="lucide-search" /></template>
      </q-input>
      <q-btn unelevated rounded no-caps color="toneflix" icon="lucide-plus" label="Add region" class="flex-none!" @click="edit()" />
    </div>

    <BlockSkeleton variant="lines" :count="3" v-if="loading && !regions.length" />

    <q-list separator v-else-if="regions.length">
      <q-item clickable :key="region.id" v-for="region in regions" @click="edit(region)">
        <q-item-section>
          <q-item-label class="font-bold">
            {{ region.name }}
            <q-badge rounded color="grey-8" label="Off" class="ml-2" v-if="!region.active" />
          </q-item-label>
          <q-item-label caption lines="2">{{ countryList(region.countries) }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-item-label>{{ region.currency }}</q-item-label>
          <q-item-label caption>{{ region.providers.map((p) => names[p]).join(', ') }}</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>

    <div class="py-12 text-center text-grey-5" v-else>No payment regions yet.</div>

    <div class="flex justify-center mt-4" v-if="pageCount > 1">
      <q-pagination dark color="toneflix" :max="pageCount" v-model="page" />
    </div>

    <q-dialog v-model="open">
      <q-card dark class="w-full max-w-lg">
        <q-form @submit="save">
          <q-card-section class="text-lg font-bold">{{ form.id ? 'Edit region' : 'New region' }}</q-card-section>

          <q-card-section class="flex flex-col gap-4">
            <q-input dark outlined dense label="Name" v-model="form.name" :error="!!errors.name" :error-message="errors.name" />

            <q-select
              dark
              outlined
              dense
              multiple
              use-chips
              use-input
              emit-value
              map-options
              label="Countries"
              input-debounce="0"
              :options="countryOptions"
              :error="!!errors.countries"
              :error-message="errors.countries"
              v-model="form.countries"
              @filter="filterCountries"
            />

            <q-select
              dark
              outlined
              dense
              multiple
              use-chips
              emit-value
              map-options
              label="Providers, in order of preference"
              :options="providerOptions"
              :error="!!errors.providers"
              :error-message="errors.providers"
              v-model="form.providers"
            />

            <div class="grid gap-4 sm:grid-cols-3">
              <q-select
                dark
                outlined
                dense
                use-input
                fill-input
                hide-selected
                label="Currency"
                input-debounce="0"
                :options="currencyOptions"
                :error="!!errors.currency"
                :error-message="errors.currency"
                v-model="form.currency"
                @filter="filterCurrencies"
              />
              <q-input
                dark
                outlined
                dense
                type="number"
                step="any"
                label="Fixed rate"
                :hint="`${form.currency || '…'} per ${currency}`"
                :disable="sameCurrency"
                :error="!!errors.exchange_rate"
                :error-message="errors.exchange_rate"
                v-model.number="form.exchange_rate"
              />
              <q-input
                dark
                outlined
                dense
                type="number"
                step="any"
                suffix="%"
                label="Markup"
                hint="On live rates"
                :disable="sameCurrency || !!form.exchange_rate"
                :error="!!errors.rate_markup"
                :error-message="errors.rate_markup"
                v-model.number="form.rate_markup"
              />
            </div>

            <q-toggle dark color="toneflix" label="On" v-model="form.active" />
          </q-card-section>

          <q-card-actions align="right" class="px-4 pb-4">
            <q-btn flat no-caps color="red-4" label="Delete" class="mr-auto" v-if="form.id" @click="remove" />
            <q-btn flat no-caps label="Cancel" v-close-popup />
            <q-btn unelevated rounded no-caps color="toneflix" type="submit" label="Save" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useWatcher } from 'alova/client';
import BlockSkeleton from 'src/components/Skeletons/BlockSkeleton.vue';
import { usePayments } from 'src/composables/usePayments';
import { notify } from 'src/utils/helpers';
import type { PaymentProvider, PaymentRegion, ResponseBody } from 'src/utils/models';
import { PaymentChoice } from 'src/utils/payments/payment-choice';
import { CountryList } from 'src/utils/payments/country-list';
import {
  deletePaymentRegionRequest,
  loadPaymentRegionsRequest,
  savePaymentRegionRequest,
} from 'src/utils/requests/payments';

const $q = useQuasar();
const { currency } = usePayments();
const names = PaymentChoice.names;

const search = ref('');
const page = ref(1);
const open = ref(false);
const saving = ref(false);
const errors = ref<Record<string, string>>({});

const blank = () => ({
  id: 0,
  name: '',
  countries: [] as string[],
  providers: ['flutterwave'] as PaymentProvider[],
  currency: '',
  exchange_rate: null as number | null,
  rate_markup: 0 as number | null,
  active: true,
});

const form = reactive(blank());

const { data, loading, send: reload } = useWatcher(
  () => loadPaymentRegionsRequest({ page: page.value, search: search.value || undefined }),
  [search, page],
  { immediate: true },
);

watch(search, () => (page.value = 1));

const regions = computed(() => data.value?.data || []);
const pageCount = computed(() => data.value?.meta?.lastPage || 1);
const sameCurrency = computed(() => !!form.currency && form.currency === currency.value);

const providerOptions = (Object.keys(names) as PaymentProvider[]).map((value) => ({ value, label: names[value] }));

const countryOptions = ref(CountryList.options());
const currencyOptions = ref(CountryList.currencies());

const filterCountries = (text: string, update: (fn: () => void) => void) =>
  update(() => {
    const needle = text.toLowerCase();
    countryOptions.value = CountryList.options().filter(
      (o) => !needle || o.label.toLowerCase().includes(needle) || o.value.toLowerCase() === needle,
    );
  });

const filterCurrencies = (text: string, update: (fn: () => void) => void) =>
  update(() => {
    const needle = text.toUpperCase();
    currencyOptions.value = CountryList.currencies().filter((c) => c.includes(needle));
  });

const countryList = (codes: string[]) => codes.map((c) => CountryList.name(c)).join(', ');

const edit = (region?: PaymentRegion) => {
  Object.assign(form, blank(), region ? {
    id: region.id,
    name: region.name,
    countries: [...region.countries],
    providers: [...region.providers],
    currency: region.currency,
    exchange_rate: region.exchangeRate ?? null,
    rate_markup: region.rateMarkup ?? 0,
    active: region.active,
  } : {});
  errors.value = {};
  open.value = true;
};

const save = async () => {
  saving.value = true;
  errors.value = {};

  try {
    const { message } = await savePaymentRegionRequest(
      {
        name: form.name,
        countries: form.countries,
        providers: form.providers,
        currency: form.currency,
        exchange_rate: sameCurrency.value ? null : form.exchange_rate || null,
        rate_markup: form.rate_markup || 0,
        active: form.active,
      },
      form.id || undefined,
    ).send();

    notify(message, 'success');
    open.value = false;
    void reload();
  } catch (e) {
    const found = ((e as ResponseBody<unknown>)?.errors || {}) as Record<string, string>;

    // Errors on one country or provider show on its field.
    errors.value = Object.fromEntries(Object.entries(found).map(([key, text]) => [key.split('.')[0], text]));
  } finally {
    saving.value = false;
  }
};

const remove = () => {
  $q.dialog({
    dark: true,
    title: 'Delete region',
    message: `Its countries pay in ${currency.value} again.`,
    cancel: { flat: true, noCaps: true, label: 'Cancel' },
    ok: { unelevated: true, rounded: true, noCaps: true, color: 'red-8', label: 'Delete' },
  }).onOk(async () => {
    try {
      const { message } = await deletePaymentRegionRequest(form.id).send();

      notify(message, 'success');
      open.value = false;
      void reload();
    } catch {
      // The API already showed why.
    }
  });
};
</script>
