<template>
  <q-dialog v-model="show" @show="reset">
    <q-card class="w-full max-w-md bg-dark">
      <q-card-section>
        <div class="text-lg font-bold">{{ contract ? 'Change contract' : 'Invite a royal' }}</div>
        <div class="text-xs text-grey-5">
          {{
            contract
              ? 'A new rate or months starts a new contract from today.'
              : 'They get an email with a link to join. It stays open for 14 days.'
          }}
        </div>
      </q-card-section>

      <q-form @submit="submit">
        <q-card-section class="flex flex-col gap-3 pt-0">
          <template v-if="!contract">
            <q-input
              dark
              filled
              dense
              type="email"
              label="Email"
              v-model="form.email"
              :error="!!errors.email"
              :error-message="errors.email"
            />
            <q-input
              dark
              filled
              dense
              label="Name"
              v-model="form.name"
              :error="!!errors.name"
              :error-message="errors.name"
            />
          </template>

          <div class="grid grid-cols-2 gap-3">
            <q-input
              dark
              filled
              dense
              type="number"
              step="0.01"
              label="Rate"
              suffix="%"
              v-model.number="form.rate"
              :error="!!errors.rate"
              :error-message="errors.rate"
            />
            <q-input
              dark
              filled
              dense
              type="number"
              label="Months"
              hint="0 for no end"
              v-model.number="form.months"
              :error="!!errors.months"
              :error-message="errors.months"
            />
          </div>
          <div class="text-xs text-grey-5">
            Of what Toneflix Music keeps from each payment by people who join with their link,
            for that many months after each one joins.
          </div>

          <q-input
            dark
            filled
            dense
            label="Invite code"
            :hint="contract ? 'Leave as is to keep it' : 'Leave empty to make one'"
            v-model="form.code"
            :error="!!errors.code"
            :error-message="errors.code"
          />
          <q-input
            dark
            filled
            dense
            autogrow
            label="Note"
            hint="Only admins see it"
            v-model="form.note"
          />
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
            :label="contract ? 'Save' : 'Send invite'"
            :loading="saving"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { notify } from 'src/utils/helpers';
import {
  RoyaltyContract,
  sendRoyaltyInviteRequest,
  updateRoyaltyContractRequest,
} from 'src/utils/requests/royalties';

const props = defineProps<{
  contract?: RoyaltyContract | null;
}>();

const emit = defineEmits<{ saved: [] }>();

const show = defineModel<boolean>({ default: false });

const saving = ref(false);
const errors = ref<Record<string, string>>({});
const form = reactive({
  email: '',
  name: '',
  rate: 20,
  months: 0,
  code: '' as string | null,
  note: '' as string | null,
});

const reset = () => {
  errors.value = {};
  Object.assign(form, {
    email: '',
    name: '',
    rate: props.contract?.rate ?? 20,
    months: props.contract?.months ?? 0,
    code: props.contract?.user?.code ?? '',
    note: props.contract?.note ?? '',
  });
};

const submit = async () => {
  saving.value = true;
  errors.value = {};

  try {
    const fields = { rate: form.rate, months: form.months || 0, code: form.code || null, note: form.note || null };
    const body = props.contract
      ? await updateRoyaltyContractRequest(props.contract.id, fields).send()
      : await sendRoyaltyInviteRequest({ ...fields, email: form.email, name: form.name }).send();

    notify(body.message, 'success');
    show.value = false;
    emit('saved');
  } catch (e) {
    const failure = e as { message?: string; errors?: Record<string, string | string[]> };

    errors.value = Object.fromEntries(
      Object.entries(failure.errors || {}).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
    ) as Record<string, string>;
    notify(failure.message || 'That didn\'t save.', 'error');
  } finally {
    saving.value = false;
  }
};
</script>
