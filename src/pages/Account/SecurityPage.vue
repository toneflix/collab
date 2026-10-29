<template>
  <div>
    <SettingsCard title="Password" caption="Use at least 8 characters.">
      <q-form class="settings-card__grid" @submit="savePassword">
        <q-input
          outlined
          type="password"
          label="Current password"
          autocomplete="current-password"
          class="settings-card__wide"
          v-model="password.password"
          :error="!!errors.password"
          :error-message="errors.password"
        />
        <q-input
          outlined
          type="password"
          label="New password"
          autocomplete="new-password"
          v-model="password.new_password"
          :error="!!errors.new_password"
          :error-message="errors.new_password"
        />
        <q-input
          outlined
          type="password"
          label="Repeat new password"
          autocomplete="new-password"
          v-model="password.new_password_confirmation"
        />
        <div class="settings-card__actions">
          <q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            type="submit"
            label="Change password"
            :disable="!password.password || !password.new_password"
            :loading="saving === 'password'"
          />
        </div>
      </q-form>
    </SettingsCard>

    <TwoFactorSettings class="settings-card" />
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useMeta } from 'quasar';
import SettingsCard from 'src/components/Account/SettingsCard.vue';
import TwoFactorSettings from 'src/components/Account/TwoFactorSettings.vue';
import { useSettingsForm } from 'src/composables/useSettingsForm';
import { notify } from 'src/utils/helpers';
import { updateAccountRequest } from 'src/utils/requests/account';

useMeta({ title: 'Security' });

const { errors, saving, run } = useSettingsForm();

const password = reactive({
  password: '',
  new_password: '',
  new_password_confirmation: '',
});

const savePassword = () =>
  run('password', 'We could not change your password.', async () => {
    const { message } = await updateAccountRequest('password', {
      ...password,
    }).send();

    Object.assign(password, {
      password: '',
      new_password: '',
      new_password_confirmation: '',
    });
    notify(message, 'success');
  });
</script>
