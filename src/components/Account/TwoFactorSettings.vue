<template>
  <section class="two-factor" aria-labelledby="two-factor-heading">
    <div class="two-factor__head">
      <div>
        <h2 id="two-factor-heading" class="two-factor__title">Two-factor sign-in</h2>
        <p class="two-factor__caption">
          Ask for a code from an authenticator app, such as Google Authenticator or 1Password,
          each time you sign in.
        </p>
      </div>
      <q-badge
        rounded
        class="two-factor__badge"
        :class="{ 'two-factor__badge--on': status?.enabled }"
        :label="status?.enabled ? 'On' : 'Off'"
        v-if="status"
      />
    </div>

    <q-skeleton type="rect" height="40px" v-if="!status" />

    <div class="two-factor__row" v-else-if="status.enabled">
      <p class="two-factor__caption">
        {{ status.recoveryCodesLeft }} recovery
        {{ status.recoveryCodesLeft === 1 ? 'code' : 'codes' }} left.
        <template v-if="status.recoveryCodesLeft < 3">Make new ones so you don't get locked out.</template>
      </p>
      <div class="two-factor__buttons">
        <q-btn outline rounded no-caps label="New recovery codes" @click="ask('codes')" />
        <q-btn outline rounded no-caps color="negative" label="Turn off" @click="ask('off')" />
      </div>
    </div>

    <div class="two-factor__row" v-else>
      <p class="two-factor__caption">Admins need it to delete content.</p>
      <q-btn unelevated rounded no-caps color="primary" label="Turn on" @click="setup.show = true" />
    </div>

    <!-- Turning it on -->
    <q-dialog v-model="setup.show" @hide="resetSetup">
      <q-card class="two-factor__dialog">
        <q-form @submit="setup.secret ? confirm() : start()">
          <q-card-section>
            <div class="text-h6">Turn on two-factor sign-in</div>
          </q-card-section>

          <q-card-section class="pt-0" v-if="!setup.secret">
            <p class="two-factor__caption mb-3">Enter your password to continue.</p>
            <q-input
              outlined
              autofocus
              type="password"
              label="Password"
              autocomplete="current-password"
              v-model="setup.password"
              :error="!!errors.password"
              :error-message="errors.password"
            />
          </q-card-section>

          <q-card-section class="pt-0" v-else>
            <p class="two-factor__caption">
              Scan this code with your authenticator app, or enter the key by hand.
            </p>
            <img class="two-factor__qr" :src="setup.qr" alt="QR code for your authenticator app" v-if="setup.qr" />
            <div class="two-factor__secret">
              <code>{{ groupedSecret }}</code>
              <q-btn flat round dense icon="lucide-copy" aria-label="Copy key" @click="copy(setup.secret)" />
            </div>
            <q-input
              outlined
              autofocus
              label="Code from the app"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              v-model="setup.code"
              :error="!!errors.code"
              :error-message="errors.code"
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat rounded no-caps label="Cancel" v-close-popup />
            <q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              type="submit"
              :label="setup.secret ? 'Turn on' : 'Continue'"
              :loading="busy"
              :disable="setup.secret ? setup.code.length < 6 : !setup.password"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- A code for turning it off or new recovery codes -->
    <q-dialog v-model="prompt.show" @hide="prompt.code = ''">
      <q-card class="two-factor__dialog">
        <q-form @submit="submitPrompt">
          <q-card-section>
            <div class="text-h6">{{ prompt.action === 'off' ? 'Turn off two-factor sign-in' : 'New recovery codes' }}</div>
            <p class="two-factor__caption mt-2">
              Enter a code from your authenticator app, or one of your recovery codes.
              <template v-if="prompt.action === 'codes'">Your old recovery codes stop working.</template>
            </p>
          </q-card-section>
          <q-card-section class="pt-0">
            <q-input
              outlined
              autofocus
              label="Code"
              autocomplete="one-time-code"
              v-model="prompt.code"
              :error="!!errors.code"
              :error-message="errors.code"
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat rounded no-caps label="Cancel" v-close-popup />
            <q-btn
              unelevated
              rounded
              no-caps
              type="submit"
              :color="prompt.action === 'off' ? 'negative' : 'primary'"
              :label="prompt.action === 'off' ? 'Turn off' : 'Make new codes'"
              :loading="busy"
              :disable="!prompt.code"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Recovery codes, shown once -->
    <q-dialog v-model="recovery.show" persistent>
      <q-card class="two-factor__dialog">
        <q-card-section>
          <div class="text-h6">Save your recovery codes</div>
          <p class="two-factor__caption mt-2">
            If you lose your phone, each of these codes signs you in once. This is the only time
            they're shown.
          </p>
        </q-card-section>
        <q-card-section class="pt-0">
          <ul class="two-factor__codes">
            <li v-for="code in recovery.codes" :key="code"><code>{{ code }}</code></li>
          </ul>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat rounded no-caps icon="lucide-copy" label="Copy" @click="copy(recovery.codes.join('\n'))" />
          <q-btn flat rounded no-caps icon="lucide-download" label="Download" @click="download" />
          <q-btn unelevated rounded no-caps color="primary" label="I saved them" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { copyToClipboard, exportFile } from 'quasar';
import QRCode from 'qrcode';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import {
  confirmTwoFactorRequest,
  disableTwoFactorRequest,
  loadTwoFactorRequest,
  newRecoveryCodesRequest,
  startTwoFactorRequest,
  type TwoFactorStatus,
} from 'src/utils/requests/twoFactor';

const boot = useBootstrapStore();
const status = ref<TwoFactorStatus | null>(null);
const busy = ref(false);
const errors = ref<Record<string, string>>({});
const setup = reactive({ show: false, password: '', secret: '', qr: '', code: '' });
const prompt = reactive({ show: false, action: <'off' | 'codes'>'off', code: '' });
const recovery = reactive({ show: false, codes: <string[]>[] });

const groupedSecret = computed(() => setup.secret.replace(/(.{4})/g, '$1 ').trim());

onMounted(async () => {
  const { data } = await loadTwoFactorRequest().send();

  status.value = data;
});

const fail = (error: unknown) => {
  const body = error as { message?: string; errors?: Record<string, string | string[]> };

  errors.value = Object.fromEntries(
    Object.entries(body.errors || {}).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  ) as Record<string, string>;

  if (!Object.keys(errors.value).length) {
    notify(body.message || 'That did not work.', 'error');
  }
};

/** Keep the signed-in user's flag in step with the account. */
const update = (next: TwoFactorStatus) => {
  status.value = next;
  boot.setUser({ ...boot.user, twoFactor: next.enabled });

  if (next.recoveryCodes?.length) {
    recovery.codes = next.recoveryCodes;
    recovery.show = true;
  }
};

const run = async (task: () => Promise<void>) => {
  busy.value = true;
  errors.value = {};

  try {
    await task();
  } catch (error) {
    fail(error);
  } finally {
    busy.value = false;
  }
};

const start = () =>
  run(async () => {
    const { data } = await startTwoFactorRequest(setup.password).send();

    setup.secret = data.secret;
    setup.qr = await QRCode.toDataURL(data.uri, { margin: 1, width: 200 });
  });

const confirm = () =>
  run(async () => {
    const { data, message } = await confirmTwoFactorRequest(setup.code).send();

    setup.show = false;
    update(data);
    notify(message, 'success');
  });

const ask = (action: 'off' | 'codes') => {
  errors.value = {};
  prompt.action = action;
  prompt.show = true;
};

const submitPrompt = () =>
  run(async () => {
    const request = prompt.action === 'off' ? disableTwoFactorRequest : newRecoveryCodesRequest;
    const { data, message } = await request(prompt.code).send();

    prompt.show = false;
    update(data);
    notify(message, 'success');
  });

const resetSetup = () => {
  Object.assign(setup, { password: '', secret: '', qr: '', code: '' });
  errors.value = {};
};

const copy = async (text: string) => {
  await copyToClipboard(text);
  notify('Copied.', 'success');
};

const download = () => {
  exportFile('toneflix-recovery-codes.txt', recovery.codes.join('\n') + '\n');
};
</script>

<style lang="scss" scoped>
.two-factor {
  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;

    > :first-child {
      flex: 1 1 auto;
      min-width: 0;
    }

    > :last-child {
      flex: none;
    }
  }

  &__title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
  }

  &__caption {
    margin: 4px 0 0;
    font-size: 0.9rem;
    color: var(--tf-text-muted);
  }

  &__badge {
    padding: 4px 10px;
    background: var(--tf-surface-3);
    color: var(--tf-text-muted);

    &--on {
      background: color-mix(in srgb, var(--tf-success) 20%, transparent);
      color: var(--tf-success);
    }
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    > :first-child {
      flex: 1 1 220px;
      margin: 0;
    }
  }

  &__buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__dialog {
    width: 100%;
    max-width: 420px;
  }

  &__qr {
    display: block;
    width: 200px;
    height: 200px;
    margin: 16px auto;
    border-radius: var(--tf-radius-md);
    background: #fff;
  }

  &__secret {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin-bottom: 16px;

    code {
      font-size: 0.85rem;
      word-break: break-all;
    }
  }

  &__codes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin: 0;
    padding: 12px;
    list-style: none;
    border-radius: var(--tf-radius-md);
    background: var(--tf-surface-2);
    font-size: 0.95rem;
    text-align: center;
  }
}
</style>
