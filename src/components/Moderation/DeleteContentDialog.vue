<template>
  <q-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" @hide="reset">
    <q-card class="w-full max-w-sm bg-dark">
      <q-form @submit="submit">
        <q-card-section>
          <div class="text-lg font-bold">Delete “{{ item?.title }}”</div>
          <div class="text-xs text-grey-5">
            This can't be undone. The owner is told, and the deletion stays in their audit trail.
            <template v-if="item?.type === 'release'"> Its tracks are deleted too.</template>
            <template v-if="item?.type === 'project'"> Its tracks, comments and collaborators go with it.</template>
          </div>
        </q-card-section>

        <q-card-section class="pt-0" v-if="!boot.user.twoFactor">
          <div class="text-sm">
            Deleting content needs two-factor sign-in on your account.
            <router-link class="underline" :to="{ name: 'account.security' }">Turn it on in security settings</router-link>,
            then come back.
          </div>
        </q-card-section>

        <q-card-section class="flex flex-col gap-3 pt-0" v-else>
          <q-select dark filled dense emit-value map-options label="Reason" :options="reportReasons" v-model="form.reason" />
          <q-input
            dark
            filled
            dense
            autogrow
            counter
            maxlength="2000"
            label="Note to the owner (optional)"
            v-model="form.note"
          />
          <q-input
            dark
            filled
            dense
            autocomplete="off"
            :label="`Type “${item?.deleteName}” to confirm`"
            :error="!!errors.confirm_name"
            :error-message="errors.confirm_name"
            v-model="form.confirm_name"
          />
          <q-input
            dark
            filled
            dense
            inputmode="numeric"
            autocomplete="one-time-code"
            label="Code from your authenticator app"
            :error="!!errors.code"
            :error-message="errors.code"
            v-model="form.code"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn
            unelevated
            rounded
            no-caps
            type="submit"
            color="red-9"
            label="Delete for good"
            :loading="busy"
            :disable="!boot.user.twoFactor || form.confirm_name.trim() !== item?.deleteName || !form.code"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import {
  deleteContentRequest,
  reportReasons,
  type ModeratedItem,
  type ReportReason,
} from 'src/utils/requests/moderation';

const props = defineProps<{ modelValue: boolean; item?: ModeratedItem | null; reason?: ReportReason }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; deleted: [] }>();

const boot = useBootstrapStore();
const busy = ref(false);
const errors = ref<Record<string, string>>({});
const form = reactive({ reason: <string>'spam', note: '', confirm_name: '', code: '' });

const reset = () => {
  Object.assign(form, { reason: props.reason || 'spam', note: '', confirm_name: '', code: '' });
  errors.value = {};
};

watch(
  () => props.modelValue,
  (open) => open && reset(),
);

const submit = async () => {
  const item = props.item;
  if (!item) return;

  busy.value = true;
  errors.value = {};

  try {
    const { message } = await deleteContentRequest(item.type, item.id, { ...form, confirm_name: form.confirm_name.trim() }).send();

    notify(message, 'success');
    emit('update:modelValue', false);
    emit('deleted');
  } catch (error) {
    const body = error as { message?: string; errors?: Record<string, string | string[]> };

    errors.value = Object.fromEntries(
      Object.entries(body.errors || {}).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
    ) as Record<string, string>;

    if (!errors.value.confirm_name && !errors.value.code) {
      notify(body.message || 'It could not be deleted.', 'error');
    }
  } finally {
    busy.value = false;
  }
};
</script>
