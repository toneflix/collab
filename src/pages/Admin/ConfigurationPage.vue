<template>
  <PanePage title="Configuration">
    <template #subtitle>
      General settings for the whole app. API keys are not here; they live in
      the API's .env file.
    </template>

    <BlockSkeleton variant="form" :count="6" v-if="loading" />

    <q-form @submit="save" v-else-if="settings">
      <SettingsSections :sections="groups" :marked="unsaved">
        <template #[group.key] :key="group.key" v-for="group in fieldGroups">
          <div class="grid gap-3 sm:grid-cols-2">
            <template v-for="key in group.keys" :key="key">
              <template v-if="fields[key]">
                <div
                  class="toggle-card sm:col-span-2"
                  v-if="fields[key].type === 'boolean'"
                >
                  <q-toggle color="toneflix" v-model="form[key]" />
                  <div class="min-w-0">
                    <div class="font-bold">{{ fields[key].title }}</div>
                    <div class="text-sm text-grey-5">
                      {{ fields[key].hint }}
                    </div>
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
                  :step="fields[key].type === 'decimal' ? 'any' : undefined"
                  :prefix="moneyKeys.includes(key) ? currency : undefined"
                  :label="fields[key].title"
                  :model-value="textValue(key)"
                  @update:model-value="
                    (value) => (form[key] = value as ConfigurationValue)
                  "
                  v-else
                >
                  <template #hint>{{ fields[key].hint }}</template>
                </q-input>
              </template>
            </template>
          </div>
        </template>

        <template #mail>
          <div class="grid gap-3 sm:grid-cols-2">
            <q-input
              dark
              outlined
              readonly
              label="Mailer"
              :model-value="settings.mail?.mailer"
            />
            <q-input
              dark
              outlined
              readonly
              label="Sends from"
              :model-value="settings.mail?.from"
            />
            <q-input
              dark
              outlined
              bottom-slots
              type="email"
              label="Send a test email to"
              class="sm:col-span-2"
              v-model="testEmail"
              @keydown.enter.prevent="sendTestMail"
            >
              <template #hint
                >Mail settings live in the API's .env file.</template
              >
              <template #after>
                <q-btn
                  unelevated
                  no-caps
                  color="toneflix"
                  label="Send test email"
                  icon="lucide-send"
                  class="flex-none!"
                  :loading="sending"
                  :disable="!testEmail"
                  @click="sendTestMail"
                />
              </template>
            </q-input>
          </div>
        </template>

        <template #footer>
          <span class="text-sm text-grey-5" v-if="changed"
            >Unsaved changes</span
          >
          <q-btn
            unelevated
            no-caps
            color="toneflix"
            type="submit"
            label="Save"
            class="flex-none!"
            :loading="saving"
            :disable="!changed"
          />
        </template>
      </SettingsSections>
    </q-form>
  </PanePage>
</template>

<script setup lang="ts">
import PanePage from 'src/components/Sections/PanePage.vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import SettingsSections, {
  type SettingsSection,
} from 'src/components/Admin/SettingsSections.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import type { ResponseBody } from 'src/utils/models';
import {
  loadConfigurationRequest,
  saveConfigurationRequest,
  sendTestMailRequest,
  type ConfigurationField,
  type ConfigurationSettings,
  type ConfigurationValue,
} from 'src/utils/requests/configuration';
import BlockSkeleton from 'src/components/Skeletons/BlockSkeleton.vue';

/** The page's sections and the settings each one holds. */
const groups: (SettingsSection & { keys: string[] })[] = [
  {
    key: 'app',
    icon: 'lucide-settings',
    title: 'App',
    caption: 'Name, contact links and sign-up checks.',
    keys: [
      'app_name',
      'app_email',
      'discord_url',
      'verify_email',
      'verify_phone',
      'token_lifespan',
    ],
  },
  {
    key: 'mail',
    icon: 'lucide-mail',
    title: 'Mail',
    caption: 'Mailer and a test email.',
    keys: [],
    hideFooter: true,
  },
  {
    key: 'accounts',
    icon: 'lucide-user-x',
    title: 'Accounts',
    caption: 'How long deleted accounts wait.',
    keys: ['account_deletion_days'],
  },
  {
    key: 'money',
    icon: 'lucide-coins',
    title: 'Money',
    caption: 'Currency, creator share and tips.',
    keys: [
      'app_currency',
      'creator_share',
      'min_tip_amount',
      'reference_prefix',
    ],
  },
  {
    key: 'invites',
    icon: 'lucide-user-plus',
    title: 'Invites',
    caption: 'What inviters earn.',
    keys: ['loyalty_rate', 'loyalty_months'],
  },
  {
    key: 'streams',
    icon: 'lucide-audio-lines',
    title: 'Stream earnings',
    caption: 'The monthly pool and what a stream counts.',
    keys: [
      'stream_pool_share',
      'stream_min_seconds',
      'stream_daily_cap',
      'stream_weight_collaboration',
      'stream_weight_recorded',
      'stream_weight_agentic',
      'stream_check_plays',
      'stream_check_share',
    ],
  },
  {
    key: 'withdrawals',
    icon: 'lucide-banknote',
    title: 'Withdrawals',
    caption: 'Minimums, hold time and approval.',
    keys: ['min_payout_amount', 'payout_hold_days', 'payout_auto_approve'],
  },
  {
    key: 'releases',
    icon: 'lucide-disc-3',
    title: 'Releases',
    caption: 'Reviews and track downloads.',
    keys: ['review_releases', 'track_downloads'],
  },
  {
    key: 'studio',
    icon: 'lucide-sliders-horizontal',
    title: 'Studio',
    caption: 'Plugins from other sites.',
    keys: ['studio_plugins'],
  },
];
/** Sections built from settings fields; Mail has its own slot. */
const fieldGroups = groups.filter((group) => group.keys.length);
const moneyKeys = ['min_tip_amount', 'min_payout_amount'];

const boot = useBootstrapStore();
const loading = ref(true);
const saving = ref(false);
const settings = ref<ConfigurationSettings>();
const form = reactive<Record<string, ConfigurationValue>>({});
const saved = ref<Record<string, ConfigurationValue>>({});
const testEmail = ref(boot.user.email ?? '');
const sending = ref(false);

const fields = computed(() => settings.value?.fields ?? {});
const currency = computed(() => String(form.app_currency ?? ''));
const differs = (key: string) =>
  JSON.stringify(form[key]) !== JSON.stringify(saved.value[key]);
const changed = computed(() => Object.keys(form).some(differs));
const unsaved = computed(() =>
  groups.filter((group) => group.keys.some(differs)).map((group) => group.key),
);

const inputType = (field: ConfigurationField) =>
  field.type === 'number' || field.type === 'decimal'
    ? 'number'
    : field.type === 'email'
      ? 'email'
      : field.type === 'url'
        ? 'url'
        : 'text';

const textValue = (key: string) => {
  const value = form[key];
  return typeof value === 'boolean' ? null : (value ?? null);
};

const fill = (data: ConfigurationSettings) => {
  settings.value = data;
  for (const [key, field] of Object.entries(data.fields)) {
    form[key] = field.type === 'boolean' ? !!field.value : field.value;
  }
  saved.value = { ...form };
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

const sendTestMail = async () => {
  if (!testEmail.value || sending.value) return;

  sending.value = true;
  try {
    const body = await sendTestMailRequest(testEmail.value).send();
    notify(body.message, 'success');
  } catch (e) {
    notify(errorText(e, "The test email couldn't be sent."), 'error');
  } finally {
    sending.value = false;
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
  titleTemplate: (title) => `${title} - Toneflix Music`,
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
</style>
