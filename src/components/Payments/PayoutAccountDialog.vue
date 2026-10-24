<template>
  <q-dialog v-model="show" @show="start">
    <q-card class="w-full max-w-sm bg-dark">
      <q-card-section>
        <div class="text-lg font-bold">{{ account ? 'Change bank account' : 'Add a bank account' }}</div>
        <div class="text-xs text-grey-5">Withdrawals are sent here. Check the name before you save.</div>
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
            label="Bank"
            option-label="name"
            option-value="code"
            :options="options"
            :loading="loadingBanks"
            :rules="[(v) => !!v || 'Choose your bank']"
            v-model="bankCode"
            @filter="filter"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey-5">No bank matches that</q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-input
            dark
            filled
            dense
            label="Account number"
            inputmode="numeric"
            maxlength="10"
            mask="##########"
            unmasked-value
            :rules="[(v) => /^\d{10}$/.test(v || '') || 'Enter the 10 digit account number']"
            v-model="accountNumber"
          />

          <div class="flex items-center gap-2 px-3 py-2 rounded resolved" v-if="resolving || resolved || resolveError">
            <q-spinner size="16px" class="!flex-none" v-if="resolving" />
            <q-icon name="fas fa-circle-check" color="green-5" class="!flex-none" v-else-if="resolved" />
            <q-icon name="fas fa-circle-exclamation" color="red-4" class="!flex-none" v-else />
            <span class="text-sm" :class="{ 'text-red-4': resolveError && !resolving }">
              {{ resolving ? 'Checking the account…' : resolved?.account_name || resolveError }}
            </span>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat no-caps label="Remove account" color="red-4" class="!flex-none mr-auto" :loading="removing" @click="remove" v-if="account" />
          <q-btn flat no-caps label="Cancel" class="!flex-none" v-close-popup />
          <q-btn unelevated rounded no-caps type="submit" color="toneflix" label="Save" class="!flex-none" :disable="!resolved" :loading="saving" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { notify } from 'src/utils/helpers';
import {
  Bank,
  loadBanksRequest,
  payoutError,
  PayoutAccount,
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

const banks = ref<Bank[]>([]);
const search = ref('');
const loadingBanks = ref(false);
const bankCode = ref<string | null>(null);
const accountNumber = ref('');
const resolved = ref<ResolvedAccount | null>(null);
const resolveError = ref('');
const resolving = ref(false);
const saving = ref(false);
const removing = ref(false);

const options = computed(() => {
  const term = search.value.toLowerCase();
  return term ? banks.value.filter((b) => b.name.toLowerCase().includes(term)) : banks.value;
});

const filter = (value: string, update: (fn: () => void) => void) => update(() => (search.value = value));

const start = async () => {
  bankCode.value = props.account?.bankCode ?? null;
  accountNumber.value = '';
  resolved.value = null;
  resolveError.value = '';

  if (banks.value.length) return;

  loadingBanks.value = true;
  try {
    banks.value = await loadBanksRequest().send();
  } catch (e) {
    notify(payoutError(e, 'The list of banks couldn\'t be loaded.'), 'error');
  } finally {
    loadingBanks.value = false;
  }
};

let lookup = 0;

// Look up the account name as soon as the bank and a full number are in.
watch([bankCode, accountNumber], async ([code, number]) => {
  resolved.value = null;
  resolveError.value = '';
  if (!code || !/^\d{10}$/.test(number || '')) return;

  const current = ++lookup;
  resolving.value = true;
  try {
    const body = await resolveAccountRequest({ bank_code: code, account_number: number }).send();
    if (current === lookup) resolved.value = body.data;
  } catch (e) {
    if (current === lookup) resolveError.value = payoutError(e, 'We couldn\'t find that account.');
  } finally {
    if (current === lookup) resolving.value = false;
  }
});

const save = async () => {
  if (!bankCode.value || !resolved.value) return;

  saving.value = true;
  try {
    const body = await savePayoutAccountRequest({ bank_code: bankCode.value, account_number: accountNumber.value }).send();
    notify(body.message, 'success');
    emit('saved', body.data);
    show.value = false;
  } catch (e) {
    notify(payoutError(e, 'The account couldn\'t be saved.'), 'error');
  } finally {
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
.resolved {
  background: rgba(255, 255, 255, 0.06);
}
</style>
