<template>
  <SettingsCard danger title="Danger zone">
    <div class="settings-card__row">
      <div>
        <div class="font-semibold">Deactivate account</div>
        <p class="settings-card__caption">
          Signs you out everywhere and hides your profile, music and comments.
          Sign in again any time to bring everything back.
        </p>
      </div>
      <q-btn
        outline
        rounded
        no-caps
        color="negative"
        label="Deactivate"
        @click="open('deactivate')"
      />
    </div>

    <q-separator class="my-4" />

    <div class="settings-card__row">
      <div>
        <div class="font-semibold">Delete account</div>
        <p class="settings-card__caption">
          Same as deactivating, but if you don't sign in within
          {{ deletionDays }} days, your account and everything in it is erased
          for good.
        </p>
      </div>
      <q-btn
        unelevated
        rounded
        no-caps
        color="negative"
        label="Delete"
        @click="open('delete')"
      />
    </div>

    <q-dialog v-model="leave.show" @hide="close">
      <q-card class="leave-dialog">
        <q-form @submit="submit">
          <q-card-section>
            <div class="text-lg font-bold">
              {{
                leave.mode === 'delete'
                  ? 'Delete your account?'
                  : 'Deactivate your account?'
              }}
            </div>
            <ul class="leave-dialog__consequences">
              <li>You'll be signed out on every device.</li>
              <li>
                Your profile, releases, projects and comments are hidden from
                everyone.
              </li>
              <li v-if="leave.mode === 'delete'">
                Unless you sign in within {{ deletionDays }} days, your account
                and everything in it is erased. This can't be undone.
              </li>
              <li v-else>Sign in again whenever you like to bring it back.</li>
            </ul>
          </q-card-section>

          <q-card-section class="pt-0">
            <q-input
              outlined
              autofocus
              type="password"
              label="Your password"
              autocomplete="current-password"
              v-model="leave.password"
              :error="!!errors.password"
              :error-message="errors.password"
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat rounded no-caps label="Cancel" v-close-popup />
            <q-btn
              unelevated
              rounded
              no-caps
              type="submit"
              color="negative"
              :label="
                leave.mode === 'delete' ? 'Delete account' : 'Deactivate account'
              "
              :disable="!leave.password"
              :loading="saving === 'leave'"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </SettingsCard>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import SettingsCard from 'src/components/Account/SettingsCard.vue';
import { useSettingsForm } from 'src/composables/useSettingsForm';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import {
  deactivateAccountRequest,
  deleteAccountRequest,
} from 'src/utils/requests/account';

type LeaveMode = 'deactivate' | 'delete';

const boot = useBootstrapStore();
const router = useRouter();
const { errors, saving, run } = useSettingsForm();

const deletionDays = computed(
  () => Number(boot.configuration.account_deletion_days) || 30,
);

const leave = reactive({
  show: false,
  mode: <LeaveMode>'deactivate',
  password: '',
});

const open = (mode: LeaveMode) => {
  errors.value = {};
  Object.assign(leave, { show: true, mode, password: '' });
};

const close = () => {
  leave.password = '';
  errors.value = {};
};

/** Deactivate or delete the account, then finish signing out here. */
const submit = () =>
  run('leave', 'We could not update your account.', async () => {
    const request =
      leave.mode === 'delete'
        ? deleteAccountRequest(leave.password)
        : deactivateAccountRequest(leave.password);
    const { message } = await request.send();

    leave.show = false;
    notify(message, 'success');
    await router.push({ name: 'auth.logout' });
  });
</script>

<style lang="scss" scoped>
.leave-dialog {
  width: 100%;
  max-width: 420px;

  &__consequences {
    margin: 12px 0 0;
    padding-left: 18px;
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--tf-text-muted);
  }
}
</style>
