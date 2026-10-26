<template>
  <q-dialog v-model="show" @show="start">
    <q-card class="w-full max-w-sm bg-dark">
      <q-card-section>
        <div class="text-lg font-bold">{{ account ? 'Change payout account' : 'Add a payout account' }}</div>
        <div class="text-xs text-grey-5">
          Withdrawals are sent here.{{ method?.lookup === 'hosted' ? '' : ' Check the name before you save.' }}
        </div>
      </q-card-section>

      <q-form @submit="save">
        <q-card-section class="flex flex-col gap-3 pt-0">
          <q-select
            dark
            filled
            dense
            use-input
            emit-value
            map-options
            input-debounce="0"
            label="Country"
            option-label="name"
            option-value="code"
            :options="countryOptions"
            :loading="loadingCountries"
            :rules="[(v) => !!v || 'Choose your country']"
            v-model="countryCode"
            @filter="filterCountries"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey-5">Withdrawals to that country aren't available yet</q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-btn-toggle
            spread
            no-caps
            unelevated
            rounded
            dense
            toggle-color="toneflix"
            color="grey-9"
            :options="country.methods.map((m) => ({ label: m.label, value: m.key }))"
            v-model="methodKey"
            v-if="country && country.methods.length > 1"
          />

          <template v-if="method?.lookup === 'hosted'">
            <div class="px-4 py-4 text-sm rounded note">
              Payouts to {{ country!.name }} go through {{ providerNames[country!.provider] }}. You'll add your bank details
              on their secure page and come straight back here. Withdrawals are sent in {{ country!.currency }}.
              <div class="mt-1 text-xs text-grey-5" v-if="pending">You started this already. Continue where you left off.</div>
            </div>
          </template>

          <template v-else-if="method">
            <q-select
              dark
              filled
              dense
              use-input
              emit-value
              map-options
              input-debounce="0"
              :label="method.providerLabel"
              option-label="name"
              option-value="code"
              :options="bankOptions"
              :loading="loadingBanks"
              :rules="[(v) => !!v || `Choose your ${method!.providerLabel.toLowerCase()}`]"
              v-model="bankCode"
              @filter="filterBanks"
            >
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey-5">Nothing matches that</q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-input
              dark
              filled
              dense
              :label="method.numberLabel"
              :inputmode="method.key === 'mobile_money' ? 'tel' : 'text'"
              maxlength="30"
              :rules="[(v) => numberValid(v) || `Check the ${method!.numberLabel.toLowerCase()}`]"
              v-model.trim="accountNumber"
            />

            <q-input
              dark
              filled
              dense
              label="Name on the account, exactly as your bank has it"
              maxlength="150"
              :rules="[(v) => !!(v || '').trim() || 'Enter the name on the account']"
              v-model="accountName"
              v-if="method.lookup !== 'resolve'"
            />

            <template v-if="method.lookup === 'validate'">
              <q-select
                dark
                filled
                dense
                emit-value
                map-options
                label="Account type"
                :options="[
                  { label: 'Personal', value: 'personal' },
                  { label: 'Business', value: 'business' },
                ]"
                v-model="accountType"
              />
              <q-select
                dark
                filled
                dense
                emit-value
                map-options
                label="ID type"
                :options="documentTypes"
                v-model="documentType"
              />
              <q-input
                dark
                filled
                dense
                label="ID number"
                maxlength="40"
                :rules="[(v) => !!(v || '').trim() || 'Enter the ID number']"
                v-model.trim="documentNumber"
              />
            </template>

            <div class="flex items-center gap-2 px-4 py-2 rounded note" v-if="method.lookup === 'resolve' && (resolving || resolved || resolveError)">
              <q-spinner size="16px" class="!flex-none" v-if="resolving" />
              <q-icon name="lucide-circle-check" color="green-5" class="!flex-none" v-else-if="resolved" />
              <q-icon name="lucide-circle-alert" color="red-4" class="!flex-none" v-else />
              <span class="text-sm" :class="{ 'text-red-4': resolveError && !resolving }">
                {{ resolving ? 'Checking the account…' : resolved?.accountName || resolveError }}
              </span>
            </div>

            <div class="text-xs text-grey-5" v-if="country && country.currency !== appCurrency">
              Withdrawals are converted to {{ country.currency }} when they're sent.
            </div>
          </template>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat no-caps label="Remove account" color="red-4" class="!flex-none mr-auto" :loading="removing" @click="remove" v-if="account" />
          <q-btn flat no-caps label="Cancel" class="!flex-none" v-close-popup />
          <q-btn
            unelevated
            rounded
            no-caps
            color="toneflix"
            class="!flex-none"
            icon-right="lucide-external-link"
            :label="`Continue to ${providerNames[country!.provider]}`"
            :loading="saving"
            @click="connect"
            v-if="method?.lookup === 'hosted'"
          />
          <q-btn
            unelevated
            rounded
            no-caps
            type="submit"
            color="toneflix"
            label="Save"
            class="!flex-none"
            :disable="!method || (method.lookup === 'resolve' && !resolved)"
            :loading="saving"
            v-else
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { usePayments } from 'src/composables/usePayments';
import { notify } from 'src/utils/helpers';
import {
  AccountDetails,
  Bank,
  connectPayoutAccountRequest,
  loadBanksRequest,
  loadPayoutCountriesRequest,
  payoutError,
  PayoutAccount,
  PayoutCountry,
  providerNames,
  removePayoutAccountRequest,
  ResolvedAccount,
  resolveAccountRequest,
  savePayoutAccountRequest,
} from 'src/utils/requests/payouts';

const props = defineProps<{
  account?: PayoutAccount | null;
}>();

const emit = defineEmits<{
  saved: [account: PayoutAccount | null];
}>();

const show = defineModel<boolean>({ default: false });
const { currency: appCurrency } = usePayments();

const documentTypes = [
  { label: 'National ID number', value: 'identityNumber' },
  { label: 'Passport number', value: 'passportNumber' },
  { label: 'Business registration number', value: 'businessRegistrationNumber' },
];

const countries = ref<PayoutCountry[]>([]);
const countrySearch = ref('');
const loadingCountries = ref(false);
const countryCode = ref<string | null>(null);
const methodKey = ref<string | null>(null);

const banks = ref<Bank[]>([]);
const bankSearch = ref('');
const loadingBanks = ref(false);
const bankCode = ref<string | null>(null);
const accountNumber = ref('');
const accountName = ref('');
const accountType = ref<'personal' | 'business'>('personal');
const documentType = ref<AccountDetails['document_type']>('identityNumber');
const documentNumber = ref('');

const resolved = ref<ResolvedAccount | null>(null);
const resolveError = ref('');
const resolving = ref(false);
const saving = ref(false);
const removing = ref(false);

const country = computed(() => countries.value.find((c) => c.code === countryCode.value));
const method = computed(() => country.value?.methods.find((m) => m.key === methodKey.value));
const pending = computed(() => props.account?.status === 'pending' && props.account.country === countryCode.value);

const matches = <T extends { name: string }>(list: T[], term: string) =>
  term ? list.filter((item) => item.name.toLowerCase().includes(term.toLowerCase())) : list;

const countryOptions = computed(() => matches(countries.value, countrySearch.value));
const bankOptions = computed(() => matches(banks.value, bankSearch.value));

const filterCountries = (value: string, update: (fn: () => void) => void) => update(() => (countrySearch.value = value));
const filterBanks = (value: string, update: (fn: () => void) => void) => update(() => (bankSearch.value = value));

const numberValid = (value?: string) => !!method.value && new RegExp(method.value.numberPattern).test(value || '');

const start = async () => {
  accountNumber.value = '';
  accountName.value = '';
  documentNumber.value = '';
  resolved.value = null;
  resolveError.value = '';

  if (!countries.value.length) {
    loadingCountries.value = true;
    try {
      countries.value = await loadPayoutCountriesRequest().send();
    } catch (e) {
      notify(payoutError(e, 'The list of countries couldn\'t be loaded.'), 'error');
    } finally {
      loadingCountries.value = false;
    }
  }

  // Start from the saved account, or the first country paid in the app's currency.
  const preferred = props.account?.country || countries.value.find((c) => c.currency === appCurrency.value)?.code;
  countryCode.value = countries.value.some((c) => c.code === preferred) ? preferred! : null;
  methodKey.value = props.account?.country === countryCode.value ? props.account?.method ?? null : null;
  if (!country.value?.methods.some((m) => m.key === methodKey.value)) {
    methodKey.value = country.value?.methods[0]?.key ?? null;
  }

  void loadBanks();
};

// Each country and way of getting paid has its own banks or networks.
let bankRequest = 0;
const loadBanks = async () => {
  banks.value = [];
  if (!countryCode.value || !method.value || method.value.lookup === 'hosted') return;

  const current = ++bankRequest;
  loadingBanks.value = true;
  try {
    const list = await loadBanksRequest(countryCode.value, method.value.key).send();
    if (current !== bankRequest) return;

    banks.value = list;
    const saved = props.account?.country === countryCode.value && props.account.method === method.value.key ? props.account.bankCode : null;
    bankCode.value = list.some((b) => b.code === saved) ? saved! : null;
  } catch (e) {
    if (current === bankRequest) notify(payoutError(e, 'The list couldn\'t be loaded.'), 'error');
  } finally {
    if (current === bankRequest) loadingBanks.value = false;
  }
};

watch(countryCode, () => {
  if (!country.value?.methods.some((m) => m.key === methodKey.value)) {
    methodKey.value = country.value?.methods[0]?.key ?? null;
  }
});

watch([countryCode, methodKey], () => {
  bankCode.value = null;
  void loadBanks();
});

const details = (): AccountDetails => ({
  country: countryCode.value!,
  method: methodKey.value!,
  bank_code: bankCode.value!,
  account_number: accountNumber.value,
  ...(method.value?.lookup !== 'resolve' ? { account_name: accountName.value.trim() } : {}),
  ...(method.value?.lookup === 'validate'
    ? { account_type: accountType.value, document_type: documentType.value, document_number: documentNumber.value }
    : {}),
});

let lookup = 0;

// Look the account name up as soon as the bank and a full number are in, where the provider can.
watch([bankCode, accountNumber, methodKey], async ([code, number]) => {
  resolved.value = null;
  resolveError.value = '';
  if (method.value?.lookup !== 'resolve' || !code || !numberValid(number)) return;

  const current = ++lookup;
  resolving.value = true;
  try {
    const body = await resolveAccountRequest(details()).send();
    if (current === lookup) resolved.value = body.data;
  } catch (e) {
    if (current === lookup) resolveError.value = payoutError(e, 'We couldn\'t find that account.');
  } finally {
    if (current === lookup) resolving.value = false;
  }
});

const save = async () => {
  if (!bankCode.value || !method.value || (method.value.lookup === 'resolve' && !resolved.value)) return;

  saving.value = true;
  try {
    const body = await savePayoutAccountRequest(details()).send();
    notify(body.message, 'success');
    emit('saved', body.data);
    show.value = false;
  } catch (e) {
    notify(payoutError(e, 'The account couldn\'t be saved.'), 'error');
  } finally {
    saving.value = false;
  }
};

/**
 * Send the creator to the provider's onboarding. They come back to this page with ?payouts=connected.
 */
const connect = async () => {
  if (!countryCode.value) return;

  saving.value = true;
  try {
    const back = new URL(window.location.href);
    back.searchParams.set('payouts', 'connected');
    const body = await connectPayoutAccountRequest(countryCode.value, back.toString()).send();
    window.location.assign(body.data.url);
  } catch (e) {
    notify(payoutError(e, 'We couldn\'t reach the provider. Please try again.'), 'error');
    saving.value = false;
  }
};

const remove = async () => {
  removing.value = true;
  try {
    const body = await removePayoutAccountRequest().send();
    notify(body.message, 'success');
    emit('saved', null);
    show.value = false;
  } catch (e) {
    notify(payoutError(e, 'The account couldn\'t be removed.'), 'error');
  } finally {
    removing.value = false;
  }
};
</script>

<style scoped>
.note {
  background: rgba(255, 255, 255, 0.06);
}
</style>
