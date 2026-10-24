<template>
  <q-page padding>
    <div class="max-w-3xl mx-auto">
      <div class="py-4">
        <h1 class="text-3xl font-circlular-std">Configuration</h1>
        <p class="text-grey-5">
          General settings for the whole app. API keys are not here; they live
          in the API's .env file.
        </p>
      </div>

      <q-spinner v-if="loading" />

      <q-form class="flex flex-col gap-4" @submit="save" v-else-if="settings">
        <div class="section" :key="group.title" v-for="group in groups">
          <div class="mb-3 font-bold">{{ group.title }}</div>

          <div class="grid gap-3 sm:grid-cols-2">
            <template v-for="key in group.keys" :key="key">
              <template v-if="fields[key]">
                <div class="toggle-card sm:col-span-2" v-if="fields[key].type === 'boolean'">
                  <q-toggle color="toneflix" v-model="form[key]" />
                  <div class="min-w-0">
                    <div class="font-bold">{{ fields[key].title }}</div>
                    <div class="text-sm text-grey-5">{{ fields[key].hint }}</div>
                  </div>
                </div>

                <q-select
                  dark
                  outlined
                  bottom-slots
                  :options="fields[key].options"
                  :label="fields[key].title"
                  v-model="form[key]"
                  v-else-if="fields[key].options"
                >
                  <template #hint>{{ fields[key].hint }}</template>
                </q-select>

                <q-input
                  dark
                  outlined
                  bottom-slots
                  :type="inputType(fields[key])"
                  :prefix="moneyKeys.includes(key) ? currency : undefined"
                  :label="fields[key].title"
                  :model-value="textValue(key)"
                  @update:model-value="(value) => (form[key] = value as ConfigurationValue)"
                  v-else
                >
                  <template #hint>{{ fields[key].hint }}</template>
                </q-input>
              </template>
            </template>
          </div>
        </div>

        <div class="flex justify-end">
          <q-btn
            unelevated
            no-caps
            color="toneflix"
            type="submit"
            label="Save"
            class="!flex-none"
            :loading="saving"
            :disable="!changed"
          />
        </div>
      </q-form>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import type { ResponseBody } from 'src/utils/models';
import {
  loadConfigurationRequest,
  saveConfigurationRequest,
  type ConfigurationField,
  type ConfigurationSettings,
  type ConfigurationValue,
} from 'src/utils/requests/configuration';

const groups = [
  { title: 'App', keys: ['app_name', 'app_email', 'verify_email', 'verify_phone'] },
  { title: 'Money', keys: ['app_currency', 'creator_share', 'min_tip_amount', 'reference_prefix'] },
  { title: 'Withdrawals', keys: ['min_payout_amount', 'payout_hold_days', 'payout_auto_approve'] },
];
const moneyKeys = ['min_tip_amount', 'min_payout_amount'];

const boot = useBootstrapStore();
const loading = ref(true);
const saving = ref(false);
const settings = ref<ConfigurationSettings>();
const form = reactive<Record<string, ConfigurationValue>>({});
let savedForm = '';

const fields = computed(() => settings.value?.fields ?? {});
const currency = computed(() => String(form.app_currency ?? ''));
const changed = computed(() => JSON.stringify(form) !== savedForm);

const inputType = (field: ConfigurationField) =>
  field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text';

const textValue = (key: string) => {
  const value = form[key];
  return typeof value === 'boolean' ? null : (value ?? null);
};

const fill = (data: ConfigurationSettings) => {
  settings.value = data;
  for (const [key, field] of Object.entries(data.fields)) {
    form[key] = field.type === 'boolean' ? !!field.value : field.value;
  }
  savedForm = JSON.stringify(form);
};

const errorText = (e: unknown, fallback: string) => {
  const err = e as ResponseBody;
  const first = err?.errors ? Object.values(err.errors)[0] : undefined;
  return (Array.isArray(first) ? first[0] : first) || err?.message || fallback;
};

const save = async () => {
  saving.value = true;
  try {
    const body = await saveConfigurationRequest({ ...form }).send();
    fill(body.data);

    // The rest of the app reads these from the configuration loaded at start-up.
    Object.assign(boot.configuration, { ...form });

    notify(body.message, 'success');
  } catch (e) {
    notify(errorText(e, "The configuration couldn't be saved."), 'error');
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  try {
    fill(await loadConfigurationRequest().send());
  } catch (e) {
    notify(errorText(e, "The configuration couldn't be loaded."), 'error');
  } finally {
    loading.value = false;
  }
});

useMeta(() => ({
  title: 'Configuration',
  titleTemplate: (title) => `${title} - Toneflix Collab`,
}));
</script>

<style lang="scss" scoped>
.toggle-card {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);

  > :first-child {
    flex: none;
  }

  > .min-w-0 {
    flex: 1 1 auto;
  }
}

.section {
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
}
</style>
