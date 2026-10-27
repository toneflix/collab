<template>
  <q-page padding>
    <div class="max-w-3xl mx-auto">
      <div class="py-8">
        <h1 class="text-3xl font-circlular-std">Realtime</h1>
        <p class="text-grey-5">
          Choose the service that delivers live updates: new messages, and
          changes collaborators make in the stem editor.
        </p>
      </div>

      <BlockSkeleton variant="form" v-if="loading && !settings" />

      <q-form class="flex flex-col gap-6" @submit="save" v-else-if="settings">
        <div class="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            class="driver"
            :class="{ 'driver--active': form.realtime_driver === option.value }"
            :aria-pressed="form.realtime_driver === option.value"
            :key="option.value"
            @click="form.realtime_driver = option.value"
            v-for="option in drivers"
          >
            <span class="driver__head">
              <q-icon :name="option.icon" size="20px" />
              <span class="driver__label">{{ option.label }}</span>
              <q-badge rounded color="green-9" label="In use" v-if="settings.driver === option.value" />
            </span>
            <span class="block mt-1 text-sm text-grey-5">{{ option.description }}</span>
          </button>
        </div>

        <SimpleInfo v-if="form.realtime_driver === 'none'">
          Realtime is off. Messages and editor changes show up when people
          reload the page.
        </SimpleInfo>

        <div class="flex flex-col gap-4" v-else>
          <p class="text-sm text-grey-5" v-if="guide">{{ guide }}</p>

          <EnvKeys :keys="settings.keys[form.realtime_driver] ?? []" />

          <div v-if="form.realtime_driver === 'firebase'">
            <div class="mb-1 text-sm text-grey-5">
              Database rules, so people only read the channels they're allowed in:
            </div>
            <pre class="rules">{{ firebaseRules }}</pre>
          </div>
        </div>

        <q-banner
          rounded
          dense
          class="text-white bg-orange-10"
          v-if="settings.missing.length && settings.driver !== 'none'"
        >
          {{ settings.driver }} still needs these in the API's .env: {{ settings.missing.join(', ') }}.
        </q-banner>

        <div class="flex items-center gap-3">
          <q-btn
            unelevated
            rounded
            no-caps
            type="submit"
            color="toneflix"
            label="Save"
            class="flex-none!"
            :loading="saving"
          />
          <q-btn
            outline
            rounded
            no-caps
            color="white"
            label="Send a test"
            class="flex-none!"
            :loading="testing"
            :disable="settings.driver === 'none' || changed"
            @click="test"
          >
            <q-tooltip v-if="changed">Save first</q-tooltip>
          </q-btn>
          <span class="text-sm" :class="result.ok ? 'text-green-5' : 'text-red-4'" v-if="result.text">
            {{ result.text }}
          </span>
        </div>
      </q-form>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import EnvKeys from 'src/components/Utilities/EnvKeys.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import { ResponseBody } from 'src/utils/models';
import { getRealtime } from 'src/utils/realtime';
import {
  loadRealtimeSettingsRequest,
  RealtimeAdminSettings,
  RealtimeDriver,
  saveRealtimeSettingsRequest,
  testRealtimeRequest,
} from 'src/utils/requests/realtime';
import BlockSkeleton from 'src/components/Skeletons/BlockSkeleton.vue';

const boot = useBootstrapStore();

const drivers: { value: RealtimeDriver; label: string; icon: string; description: string }[] = [
  { value: 'none', label: 'Off', icon: 'lucide-ban', description: 'No live updates.' },
  {
    value: 'reverb',
    label: 'Reverb',
    icon: 'lucide-server',
    description: 'Laravel\'s own server, run alongside the API. Free; you host it.',
  },
  { value: 'pusher', label: 'Pusher', icon: 'lucide-radio-tower', description: 'Hosted Pusher Channels.' },
  { value: 'ably', label: 'Ably', icon: 'lucide-network', description: 'Hosted Ably, through its Pusher protocol support.' },
  {
    value: 'firebase',
    label: 'Firebase',
    icon: 'lucide-flame',
    description: 'Firebase Realtime Database.',
  },
];

const guides: Partial<Record<RealtimeDriver, string>> = {
  reverb: 'Start the server with "php artisan reverb:start". REVERB_HOST and REVERB_PORT are where browsers reach it.',
  pusher: 'Find these under App Keys in your Pusher Channels app.',
  ably: 'Use an API key with publish and subscribe rights, and turn on "Pusher protocol support" in the Ably app\'s settings.',
  firebase:
    'FIREBASE_CREDENTIALS takes the service account JSON (or a path to it) from Project settings → Service accounts; the rest come from the web app\'s config under Project settings → General.',
};

const loading = ref(true);
const saving = ref(false);
const testing = ref(false);
const settings = ref<RealtimeAdminSettings>();
const form = reactive<{ realtime_driver: RealtimeDriver }>({ realtime_driver: 'none' });
const result = reactive({ ok: false, text: '' });
let savedForm = '';

const guide = computed(() => guides[form.realtime_driver]);
const changed = computed(() => JSON.stringify(form) !== savedForm);

const firebaseRules = `{
  "rules": {
    "arkstack": {
      "channels": {
        "$channel": {
          ".read": "auth != null && root.child('arkstack/grants/' + auth.uid + '/' + $channel).val() > now",
          ".indexOn": ["at"]
        }
      },
      "channels-index": { ".indexOn": ["at"] }
    }
  }
}`;

const fill = (data: RealtimeAdminSettings) => {
  settings.value = data;
  form.realtime_driver = data.driver;
  savedForm = JSON.stringify(form);
  // Browsers on this page connect with the new settings straight away.
  boot.realtime = data.client;
};

const load = async () => {
  loading.value = true;
  try {
    fill((await loadRealtimeSettingsRequest().send()) as unknown as RealtimeAdminSettings);
  } catch (e) {
    notify((e as ResponseBody)?.message || 'The realtime settings couldn\'t be loaded.', 'error');
  } finally {
    loading.value = false;
  }
};

const save = async () => {
  saving.value = true;
  result.text = '';
  try {
    const body = await saveRealtimeSettingsRequest({ ...form }).send();
    fill(body.data);
    notify(body.message, body.data.missing.length ? 'info' : 'success');
  } catch (e) {
    const errors = (e as ResponseBody)?.errors;
    notify(
      (errors && Object.values(errors)[0]) || (e as ResponseBody)?.message || 'The settings couldn\'t be saved.',
      'error',
    );
  } finally {
    saving.value = false;
  }
};

/**
 * Listen on this admin's own channel, ask the API to send a test event
 * there, and report whether it arrived.
 */
const test = async () => {
  const rt = getRealtime();
  if (!rt) return;

  testing.value = true;
  result.text = '';
  let stop: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const arrived = new Promise<number>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), 10000);
      void rt
        .listen(`private-user.${boot.user.id}`, 'realtime.test', () => resolve(performance.now()))
        .then((off) => (stop = off))
        .catch(reject);
    });

    // Give the subscription a moment to be confirmed before sending.
    await new Promise((r) => setTimeout(r, 800));
    const started = performance.now();
    await testRealtimeRequest().send();
    const at = await arrived;

    result.ok = true;
    result.text = `It works: the test arrived in ${Math.max(1, Math.round(at - started))} ms.`;
  } catch (e) {
    result.ok = false;
    result.text =
      (e as Error)?.message === 'timeout'
        ? 'The test was sent but never arrived. Check the host, port and keys in .env.'
        : (e as ResponseBody)?.message || (e as Error)?.message || 'The test failed.';
  } finally {
    clearTimeout(timer);
    stop?.();
    testing.value = false;
  }
};

onMounted(load);
</script>

<style lang="scss" scoped>
.driver {
  padding: 14px 16px;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  &--active {
    border-color: #03bfff;
    background: rgba(3, 191, 255, 0.1);
  }

  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
  }

  &__label {
    flex: 1 1 auto;
    font-weight: 700;
    text-align: left;
  }
}

.rules {
  padding: 12px;
  overflow-x: auto;
  font-size: 12px;
  border-radius: 8px;
  background: #0d0d0d;
}
</style>
