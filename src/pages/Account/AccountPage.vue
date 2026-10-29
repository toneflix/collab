<template>
  <div>
    <SettingsCard title="Profile" caption="Shown on your public page.">
      <template #action>
        <q-btn
          flat
          rounded
          no-caps
          color="primary"
          icon-right="lucide-arrow-up-right"
          label="View your page"
          :to="{ name: 'user', params: { artist_id: user.username } }"
          v-if="user.username"
        />
      </template>

      <div class="flex items-center gap-4 mb-6 flex-nowrap">
        <ImageCropper
          class="flex-none!"
          :aspect-ratio="1"
          :buttons="{ cancel: 'Cancel', crop: 'Use photo' }"
          @result="savePhoto"
        >
          <template #default="{ open }">
            <button
              type="button"
              class="avatar-edit"
              aria-label="Change your photo"
              @click="open"
            >
              <q-avatar size="72px">
                <img :src="user.imageUrl" alt="" />
              </q-avatar>
              <span class="avatar-edit__badge">
                <q-spinner size="18px" v-if="saving === 'photo'" />
                <q-icon name="lucide-camera" size="18px" v-else />
              </span>
            </button>
          </template>
        </ImageCropper>
        <div class="text-sm text-fg-muted">
          A square photo works best. PNG or JPG, up to 1 MB.
        </div>
      </div>

      <q-form
        class="settings-card__grid"
        @submit="save('profile', ['firstname', 'lastname', 'username', 'about'])"
      >
        <q-input
          outlined
          label="First name"
          v-model="form.firstname"
          :error="!!errors.firstname"
          :error-message="errors.firstname"
        />
        <q-input
          outlined
          label="Last name"
          v-model="form.lastname"
          :error="!!errors.lastname"
          :error-message="errors.lastname"
        />
        <q-input
          outlined
          prefix="@"
          label="Username"
          class="settings-card__wide"
          hint="Letters, numbers, dashes and underscores. Your page link uses it."
          v-model="form.username"
          :error="!!errors.username"
          :error-message="errors.username"
        />
        <q-input
          outlined
          autogrow
          counter
          type="textarea"
          label="About you"
          class="settings-card__wide"
          maxlength="1000"
          v-model="form.about"
          :error="!!errors.about"
          :error-message="errors.about"
        />
        <div class="settings-card__actions">
          <q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            type="submit"
            label="Save profile"
            :loading="saving === 'profile'"
          />
        </div>
      </q-form>
    </SettingsCard>

    <SettingsCard
      title="Contact"
      caption="Only you and the Toneflix team see these."
    >
      <q-form
        class="settings-card__grid"
        @submit="save('contact', ['email', 'phone'])"
      >
        <q-input
          outlined
          type="email"
          label="Email"
          v-model="form.email"
          :error="!!errors.email"
          :error-message="errors.email"
        />
        <q-input
          outlined
          type="tel"
          label="Phone"
          v-model="form.phone"
          :error="!!errors.phone"
          :error-message="errors.phone"
        />
        <div class="settings-card__actions">
          <q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            type="submit"
            label="Save contact"
            :loading="saving === 'contact'"
          />
        </div>
      </q-form>
    </SettingsCard>

    <SettingsCard
      title="Location"
      caption="Your country also decides how earnings are paid out."
    >
      <q-form
        class="settings-card__grid settings-card__grid--3"
        @submit="save('location', ['country', 'state', 'city'])"
      >
        <q-input
          outlined
          label="Country"
          v-model="form.country"
          :error="!!errors.country"
          :error-message="errors.country"
        />
        <q-input
          outlined
          label="State or region"
          v-model="form.state"
          :error="!!errors.state"
          :error-message="errors.state"
        />
        <q-input
          outlined
          label="City"
          v-model="form.city"
          :error="!!errors.city"
          :error-message="errors.city"
        />
        <div class="settings-card__actions">
          <q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            type="submit"
            label="Save location"
            :loading="saving === 'location'"
          />
        </div>
      </q-form>
    </SettingsCard>

    <LeaveAccountCard />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useMeta } from 'quasar';
import LeaveAccountCard from 'src/components/Account/LeaveAccountCard.vue';
import SettingsCard from 'src/components/Account/SettingsCard.vue';
import ImageCropper from 'src/components/Utilities/ImageCropper.vue';
import { useSettingsForm } from 'src/composables/useSettingsForm';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import {
  updateAccountRequest,
  updateAvatarRequest,
  type AccountFields,
} from 'src/utils/requests/account';

type Field = keyof AccountFields;
type CropResult = { base64: string; blob: Blob; file: File };

useMeta({ title: 'Account settings' });

const boot = useBootstrapStore();
const user = computed(() => boot.user);
const { errors, saving, run } = useSettingsForm();

const form = reactive({
  firstname: '',
  lastname: '',
  username: '',
  about: '',
  email: '',
  phone: '',
  country: '',
  state: '',
  city: '',
});

/** Fill the form from the signed-in account, which may arrive after the page. */
watch(
  () => boot.user.id,
  () => {
    Object.keys(form).forEach((key) => {
      const value = boot.user[key as keyof typeof boot.user];

      form[key as keyof typeof form] = typeof value === 'string' ? value : '';
    });
  },
  { immediate: true },
);

/** Send only the fields of one card that differ from the saved account. */
const save = (section: string, fields: Field[]) =>
  run(section, 'We could not save your changes.', async () => {
    const changed = fields.filter(
      (key) =>
        form[key as keyof typeof form] !==
        (boot.user[key as keyof typeof boot.user] ?? ''),
    );

    if (!changed.length) {
      notify('Nothing has changed yet.', 'info');
      return;
    }

    const payload = Object.fromEntries(
      changed.map((key) => [key, form[key as keyof typeof form]]),
    );
    const { data, message } = await updateAccountRequest(section, payload).send();

    boot.setUser({ ...boot.user, ...data });
    notify(message, 'success');
  });

const savePhoto = (result: CropResult) =>
  run('photo', 'We could not change your photo.', async () => {
    const type = result.blob.type || 'image/png';
    const file = new File(
      [result.blob],
      `avatar.${type.split('/')[1] || 'png'}`,
      { type },
    );
    const { data, message } = await updateAvatarRequest(file).send();

    boot.setUser({ ...boot.user, ...data });
    notify(message, 'success');
  });
</script>

<style lang="scss" scoped>
.avatar-edit {
  position: relative;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;

  &__badge {
    position: absolute;
    right: -2px;
    bottom: -2px;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    color: var(--tf-text);
    border: 2px solid var(--tf-surface-1);
    border-radius: 50%;
    background: var(--tf-surface-3);
  }
}
</style>
